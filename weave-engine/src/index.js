require("./instrument");
const { validateEnv, env } = require("./enviroments");
const { logger } = require("./services/logger");
const {
  registerShutdownHandler,
  setupGracefulShutdown,
} = require("./services/graceful-shutdown");
const redis = require("./services/cache/redis.client");
const {
  closeDatabase,
  connectDatabase,
} = require("./services/database/postgres.client");
const queueRouter = require("./router/index");

async function bootstrap() {
  logger.info("weave-engine starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  await connectDatabase();
  queueRouter.start().catch((err) => {
    logger.error("QueueRouter loop failed fatally", { error: err.message });
  });

  registerShutdownHandler("queue-router", async () => {
    queueRouter.stop();
  });
  registerShutdownHandler("redis", async () => {
    await redis.quit();
  });
  registerShutdownHandler("database", async () => {
    await closeDatabase();
  });
  registerShutdownHandler("sentry", async () => {
    await require("@sentry/node").close(2000);
  });

  logger.info("weave-engine ready");
}

setupGracefulShutdown();

bootstrap().catch((err) => {
  logger.error("Failed to start weave-engine", {
    error: err.message,
    stack: err.stack,
  });
  process.exitCode = 1;
});
