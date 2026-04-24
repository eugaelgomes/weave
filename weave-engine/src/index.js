const { validateEnv, env } = require("./config");
const { logger, setupGracefulShutdown } = require("./lib");

async function bootstrap() {
  logger.info("weave-engine starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  logger.info("weave-engine ready");
}

setupGracefulShutdown();

bootstrap().catch((err) => {
  logger.error("Failed to start weave-engine", { error: err.message, stack: err.stack });
  process.exitCode = 1;
});
