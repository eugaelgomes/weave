const { validateEnv, env } = require("./config");
const { logger } = require("./logger");
const { registerShutdownHandler, setupGracefulShutdown } = require("./graceful-shutdown");
const redis = require("./config/redis.client");
const { initializeServices, llmQueueProcessor } = require("./services");

async function bootstrap() {
  logger.info("weave-engine starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  initializeServices();

  registerShutdownHandler("llm-queue-processor", async () => {
    llmQueueProcessor.stop();
  });
  registerShutdownHandler("redis", async () => {
    await redis.quit();
  });

  logger.info("weave-engine ready");
}

setupGracefulShutdown();

bootstrap().catch((err) => {
  logger.error("Failed to start weave-engine", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
