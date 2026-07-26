const express = require("express");
const crypto = require("crypto");
const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  verifyInternalService,
} = require("@/middlewares/security/verify-internal-service");
const { configureServerForUser } = require("@/config/mcp");

// Store active SSE sessions
// Map<sessionId, { transport: SSEServerTransport, server: Server }>
const sessions = new Map();

const handleSSE = async (req, res, messagesPathPrefix) => {
  try {
    const sessionId = crypto.randomUUID();

    // Create a new server instance scoped to the user context
    const server = configureServerForUser(req.user);

    // Create the SSE transport with the return URL for POST messages
    const sseTransport = new SSEServerTransport(
      `${messagesPathPrefix}?sessionId=${sessionId}`,
      res
    );

    sessions.set(sessionId, { server, transport: sseTransport });

    // Connect the server to the transport
    await server.connect(sseTransport);

    // Cleanup when the connection is closed by the client
    res.on("close", () => {
      sessions.delete(sessionId);
      try {
        if (typeof server.close === "function") server.close();
      } catch {
        // Ignored
      }
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

  if (!session) {
    return res.status(404).send("SSE session not found or already closed.");
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(
      `[MCP Error] Error handling post message for session ${sessionId}:`,
      error
    );
    if (!res.headersSent) {
      res.status(500).send("Internal server error.");
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
