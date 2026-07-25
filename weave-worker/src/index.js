require("./instrument");
const { validateEnv, env } = require("./config/enviroment");
const { logger } = require("./config/logger");
const { setupGracefulShutdown, registerShutdownHandler } = require("./config/graceful-shutdown");
const { closePool } = require("./database/connection");
const { initializeJobs } = require("./app");

async function bootstrap() {
  logger.info("weave-worker starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  initializeJobs();

  registerShutdownHandler("database", closePool);
  registerShutdownHandler("sentry", async () => {
    await require("@sentry/node").close(2000);
  });

  logger.info("weave-worker ready");
}

setupGracefulShutdown();

bootstrap().catch((err) => {
  logger.error("Failed to start worker", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
