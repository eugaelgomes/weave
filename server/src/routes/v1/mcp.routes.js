const express = require("express");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const { requireBearerAuth } = require("@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js");
const { verifyInternalService } = require("@/middlewares/security/verify-internal-service");
const { configureServerForUser } = require("@/config/mcp");
const { getMcpOAuthConfig } = require("@/modules/authentication/config/mcp-oauth.config");
const mcpOAuthProvider = require("@/modules/authentication/services/mcp-oauth.provider");
const { redis: redisPublisher } = require("@theweave/shared");

// Create a dedicated Redis subscriber connection for MCP events
const redisSubscriber = redisPublisher.duplicate();

// Store active SSE sessions
// Map<sessionId, { transport: SSEServerTransport, server: Server }>
const sessions = new Map();

// Global Redis Listener for distributed MCP messages
redisSubscriber.on("message", async (channel, message) => {
  if (channel.startsWith("mcp-session:")) {
    const sessionId = channel.substring("mcp-session:".length);
    const session = sessions.get(sessionId);

    // Se a sessão existir neste node, injetamos a mensagem
    if (session) {
      try {
        const parsed = JSON.parse(message);
        if (session.transport.handleMessage) {
          await session.transport.handleMessage(parsed);
        } else if (session.transport.onmessage) {
          session.transport.onmessage(parsed);
        }
      } catch (err) {
        console.error(`[MCP Redis Error] Failed to process message for session ${sessionId}:`, err);
      }
    }
  }
});

const handleServiceSSE = async (req, res, messagesPathPrefix) => {
  try {
    // Create a new server instance scoped to the user context
    const server = configureServerForUser(req.user);

    // Disable proxy buffering for Caddy/Nginx & keep connection alive
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Create the SSE transport with the messages endpoint prefix.
    // SSEServerTransport automatically generates its own sessionId and appends it to the endpoint URL.
    const sseTransport = new SSEServerTransport(messagesPathPrefix, res);
    const sessionId = sseTransport.sessionId;

    sessions.set(sessionId, { server, transport: sseTransport });

    // Inscreve no Redis para escutar mensagens direcionadas a esta sessão
    const redisChannel = `mcp-session:${sessionId}`;
    await redisSubscriber.subscribe(redisChannel).catch((err) => {
      console.error(`[MCP Error] Failed to subscribe to Redis channel ${redisChannel}:`, err);
    });

    // Connect the server to the transport
    await server.connect(sseTransport);

    // Cleanup with a grace period when the connection is closed by the client
    // Cloud clients (Notion, Microsoft Foundry) may close the GET stream right after receiving the endpoint
    res.on("close", () => {
      setTimeout(() => {
        sessions.delete(sessionId);
        redisSubscriber.unsubscribe(redisChannel).catch(() => {});
        try {
          if (typeof server.close === "function") server.close();
        } catch {
          // Ignored
        }
      }, 60000); // 60 seconds grace period
    });
  } catch (error) {
    console.error("[MCP Error] Failed to initialize SSE connection:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error during MCP initialization");
    }
  }
};

/**
 * Bind the OAuth token context to the shape expected by the tool registry.
 * Browser sessions and personal API tokens intentionally do not authenticate
 * this endpoint; public MCP access is OAuth-only.
 */
function attachMcpOAuthUser(req, _res, next) {
  const auth = req.auth;
  const userId = auth?.extra?.userId;
  if (!userId) return next(new Error("MCP OAuth access token is missing its user identity."));

  req.user = {
    isMcpOAuth: true,
    mcpClientId: auth.clientId,
    oauthScopes: auth.scopes,
    userId,
    workspace_id: auth.extra.workspaceId || null,
    workspaceId: auth.extra.workspaceId || null,
  };
  return next();
}

async function handleStreamableHttp(req, res) {
  let server;
  let transport;
  try {
    // Stateless Streamable HTTP scales without pinning a client session to a
    // process. Weave tools are already configured from the verified token on
    // every request.
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    server = configureServerForUser(req.user);
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[MCP Error] Failed to handle Streamable HTTP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: { code: -32603, message: "Internal MCP server error" },
        id: null,
        jsonrpc: "2.0",
      });
    }
  } finally {
    // Stateless transports have no connection to preserve after a response.
    if (server && transport) {
      try {
        await server.close();
      } catch {
        // Response delivery must not fail because cleanup failed.
      }
    }
  }
}

const handleMessages = async (req, res) => {
  const sessionId = req.query.sessionId;

  if (!sessionId) {
    return res.status(400).send("Missing sessionId parameter.");
  }

  const session = sessions.get(sessionId);

  if (session) {
    // A sessão está na RAM deste container! Processa localmente.
    try {
      await session.transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error(`[MCP Error] Error handling post message for session ${sessionId}:`, error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error.");
      }
    }
  } else {
    // A sessão NÃO está neste container. Publica no Redis para chegar no container correto.
    try {
      const payload = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const redisChannel = `mcp-session:${sessionId}`;

      const receivers = await redisPublisher.publish(redisChannel, payload);

      // Se 0 containers receberam, a sessão não existe em lugar nenhum
      if (receivers === 0) {
        return res.status(404).send("SSE session not found or already closed.");
      }

      // Responde ao Foundry que a mensagem foi enfileirada com sucesso
      return res.status(202).send("Accepted");
    } catch (error) {
      console.error(`[MCP Error] Failed to publish message for session ${sessionId}:`, error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error.");
      }
    }
  }
};

const createMCPRouter = ({ version: _version = "v1" } = {}) => {
  const router = express.Router();
  const config = getMcpOAuthConfig();
  const resourceMetadataUrl = new URL(
    `/.well-known/oauth-protected-resource${config.mcpUrl.pathname}`,
    config.issuerUrl
  ).href;

  router.all(
    "/",
    requireBearerAuth({
      resourceMetadataUrl,
      verifier: mcpOAuthProvider,
    }),
    attachMcpOAuthUser,
    handleStreamableHttp
  );
  return router;
};

const createServiceMCPRouter = () => {
  const router = express.Router();
  router.get("/sse", verifyInternalService, (req, res) =>
    handleServiceSSE(req, res, "/api/service/v1/mcp/messages")
  );
  router.post("/messages", verifyInternalService, handleMessages);
  return router;
};

const closeAllSessions = () => {
  for (const [sessionId, session] of sessions.entries()) {
    try {
      if (session.server && typeof session.server.close === "function") {
        session.server.close();
      }
    } catch {
      // Ignored
    }
    sessions.delete(sessionId);
  }
};

module.exports = {
  closeAllSessions,
  createMCPRouter,
  createServiceMCPRouter,
};
