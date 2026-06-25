require("./instrument");
const { validateEnv, env } = require("./config/enviroments");
const { logger } = require("./infrastructure/logger");
const {
  registerShutdownHandler,
  setupGracefulShutdown,
} = require("./infrastructure/graceful-shutdown");
const redis = require("./infrastructure/cache/redis.client");
const {
  closeDatabase,
  connectDatabase,
} = require("./infrastructure/database/postgres.client");
const llmQueueProcessor = require("./workflows/reactive-chat/chat.processor");

const proactiveQueueProcessor = require("./workflows/proactive-jobs/proactive.processor");

async function bootstrap() {
  logger.info("weave-engine starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  await connectDatabase();
  await llmQueueProcessor.start();
  await proactiveQueueProcessor.start();

  registerShutdownHandler("llm-queue-processor", async () => {
    llmQueueProcessor.stop();
  });
  registerShutdownHandler("proactive-queue-processor", async () => {
    proactiveQueueProcessor.stop();
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
