const { logger } = require("./logger");
const { registerShutdownHandler, setupGracefulShutdown } = require("./graceful-shutdown");

module.exports = {
  logger,
  registerShutdownHandler,
  setupGracefulShutdown,
};
