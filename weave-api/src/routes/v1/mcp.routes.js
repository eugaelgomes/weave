const express = require("express");
const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  verifyInternalService,
} = require("@/middlewares/security/verify-internal-service");
const { configureServerForUser } = require("@/config/mcp");
const redisPublisher = require("@/services/queue/connection");

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
        console.error(
          `[MCP Redis Error] Failed to process message for session ${sessionId}:`,
          err
        );
      }
    }
  }
});

const handleSSE = async (req, res, messagesPathPrefix) => {
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
      console.error(
        `[MCP Error] Failed to subscribe to Redis channel ${redisChannel}:`,
        err
      );
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
      console.error(
        `[MCP Error] Error handling post message for session ${sessionId}:`,
        error
      );
      if (!res.headersSent) {
        res.status(500).send("Internal server error.");
      }
    }
  } else {
    // A sessão NÃO está neste container. Publica no Redis para chegar no container correto.
    try {
      const payload =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const redisChannel = `mcp-session:${sessionId}`;

      const receivers = await redisPublisher.publish(redisChannel, payload);

      // Se 0 containers receberam, a sessão não existe em lugar nenhum
      if (receivers === 0) {
        return res.status(404).send("SSE session not found or already closed.");
      }

      // Responde ao Foundry que a mensagem foi enfileirada com sucesso
      return res.status(202).send("Accepted");
    } catch (error) {
      console.error(
        `[MCP Error] Failed to publish message for session ${sessionId}:`,
        error
      );
      if (!res.headersSent) {
        res.status(500).send("Internal server error.");
      }
    }
  }
};

const createMCPRouter = ({ version: _version = "v1" } = {}) => {
  const router = express.Router();
  router.get("/sse", verifyToken, (req, res) =>
    handleSSE(req, res, "/api/v1/mcp/messages")
  );
  router.post("/messages", verifyToken, handleMessages);
  return router;
};

const createServiceMCPRouter = () => {
  const router = express.Router();
  router.get("/sse", verifyInternalService, (req, res) =>
    handleSSE(req, res, "/api/service/v1/mcp/messages")
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
