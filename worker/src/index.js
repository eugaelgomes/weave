require("./instrument");
const { validateEnv, env } = require("./config/enviroment");
const { logger, closePool } = require("@theweave/database");
const { setupGracefulShutdown, registerShutdownHandler } = require("./config/graceful-shutdown");
const { initializeJobs, startAllJobs, stopAllJobs } = require("./app");

async function bootstrap() {
  logger.info("weave-worker starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  initializeJobs();
  startAllJobs();

  registerShutdownHandler("processors", async () => {
    stopAllJobs();
  });
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
