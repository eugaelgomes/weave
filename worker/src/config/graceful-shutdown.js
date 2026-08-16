const { logger } = require("@theweave/database");

const shutdownHandlers = [];
let isShuttingDown = false;

function registerShutdownHandler(name, handler) {
  shutdownHandlers.push({ handler, name });
}

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, ignoring signal", { signal });
    return;
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    logger.error("Shutdown timeout exceeded, forcing exit");
    process.exit(1);
  }, 30000);

  for (const { name, handler } of shutdownHandlers) {
    try {
      logger.info(`Shutting down: ${name}`);
      await handler();
      logger.info(`${name} shutdown complete`);
    } catch (error) {
      logger.error(`Error shutting down ${name}`, { error: error.message });
    }
  }

  clearTimeout(timeout);
  logger.info("Graceful shutdown complete");
  process.exit(0);
}

function setupGracefulShutdown() {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error });
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { error: reason });
  });
}

module.exports = { registerShutdownHandler, setupGracefulShutdown };
