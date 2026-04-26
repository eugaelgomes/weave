const { validateEnv, env } = require("./config/enviroments");
const { logger } = require("./logger");
const { registerShutdownHandler, setupGracefulShutdown } = require("./graceful-shutdown");
const redis = require("./services/redis.client");
const { closeDatabase, connectDatabase } = require("./services/postgres.client");
const llmQueueProcessor = require("./modules/processors/llm-queue.processor");

async function bootstrap() {
  logger.info("weave-engine starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  await connectDatabase();
  await llmQueueProcessor.start();

  registerShutdownHandler("llm-queue-processor", async () => {
    llmQueueProcessor.stop();
  });
  registerShutdownHandler("redis", async () => {
    await redis.quit();
  });
  registerShutdownHandler("database", async () => {
    await closeDatabase();
  });

  logger.info("weave-engine ready");
}

setupGracefulShutdown();

bootstrap().catch((err) => {
  logger.error("Failed to start weave-engine", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
