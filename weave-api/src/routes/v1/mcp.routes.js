const express = require("express");
const crypto = require("crypto");
const {
  SSEServerTransport,
} = require("@modelcontextprotocol/sdk/server/sse.js");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { configureServerForUser } = require("@/config/mcp");

const router = express.Router();

// Store active SSE sessions
// Map<sessionId, { transport: SSEServerTransport, server: Server }>
const sessions = new Map();

/**
 * Initializes an SSE connection for the MCP Server.
 * A new Server instance is created and bound to the authenticated user's context.
 */
router.get("/sse", verifyToken, async (req, res) => {
  try {
    const sessionId = crypto.randomUUID();

    // Create a new server instance scoped to the user
    const server = configureServerForUser(req.user);

    // Create the SSE transport with the return URL for POST messages
    const sseTransport = new SSEServerTransport(
      `/api/v1/mcp/messages?sessionId=${sessionId}`,
      res
    );

    sessions.set(sessionId, { server, transport: sseTransport });

    // Connect the server to the transport
    await server.connect(sseTransport);

    // Cleanup when the connection is closed by the client
    res.on("close", () => {
      sessions.delete(sessionId);
      // Wait for server cleanup if supported by the SDK, although connect handles stream piping.
      try {
        server.close();
      } catch {
        // Ignored if server.close() is not synchronous or available
      }
    });
  } catch (error) {
    console.error("[MCP Error] Failed to initialize SSE connection:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error during MCP initialization");
    }
  }
});

/**
 * Handles incoming JSON-RPC messages for a specific SSE session.
 */
router.post("/messages", verifyToken, async (req, res) => {
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
});

/**
 * Gracefully closes all active SSE sessions.
 * Intended to be called during application shutdown.
 */
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

/**
 * Creates and configures the Express router for MCP endpoints
 *
 * @param {object} options - Router options
 * @param {string} [options.version="v1"] - The API version
 * @returns {import('express').Router} Express Router instance
 */
const createMCPRouter = ({ version: _version = "v1" } = {}) => {
  return router;
};

module.exports = {
  closeAllSessions,
  createMCPRouter,
  mcpRouter: router,
};
