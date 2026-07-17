const Sentry = require("@sentry/node");
const { pool } = require("@/database/connection");

/**
 * Configures graceful shutdown and process-level error logging/handling
 *
 * @param {import('http').Server} server - The HTTP server instance
 */
const configureShutdown = (server) => {
  /**
   * Handles graceful shutdown of the server
   * @param {string} signal - The signal received
   */
  const gracefulShutdown = async (signal) => {
    console.info(`${signal} signal received: closing HTTP server`);

    const shutdownTimeout = setTimeout(() => {
      console.error("Graceful shutdown timeout, forcing exit");
      process.exit(1);
    }, 30000);

    try {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.info("HTTP server closed");

      // Close all active MCP SSE sessions
      try {
        const { closeAllSessions } = require("@/routes/v1/mcp.routes");
        closeAllSessions();
        console.info("MCP SSE sessions closed");
      } catch (e) {
        console.error("Error closing MCP SSE sessions:", e);
      }

      await pool.end();
      console.info("Database connections closed");

      clearTimeout(shutdownTimeout);
      await Sentry.close(2000);
      process.exit(0);
    } catch (error) {
      console.error("Error during graceful shutdown:", error);
      clearTimeout(shutdownTimeout);
      Sentry.captureException(error);
      await Sentry.close(2000);
      process.exit(1);
    }
  };

  // Shutdown signals
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Process-level error loggers
  process.on("uncaughtException", async (error) => {
    console.error("Uncaught Exception thrown:", error);
    Sentry.captureException(error);
    await Sentry.close(2000);
    process.exit(1);
  });

  process.on("unhandledRejection", async (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    Sentry.captureException(reason);
    await Sentry.close(2000);
    process.exit(1);
  });
};

module.exports = { configureShutdown };
