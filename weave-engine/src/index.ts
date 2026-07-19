import "./instrument";
import { validateEnv, env } from "./enviroments";
import { logger } from "./services/logger";
import {
  registerShutdownHandler,
  setupGracefulShutdown,
} from "./services/graceful-shutdown";
import redis from "./services/cache/redis.client";
import {
  closeDatabase,
  connectDatabase,
} from "./services/database/postgres.client";
import queueRouter from "./router/index";
import * as Sentry from "@sentry/node";

async function bootstrap() {
  logger.info("weave-engine starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  await connectDatabase();
  queueRouter.start().catch((err: any) => {
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
    await Sentry.close(2000);
  });

  logger.info("weave-engine ready");
}

setupGracefulShutdown();

bootstrap().catch((err: any) => {
  logger.error("Failed to start weave-engine", {
    error: err.message,
    stack: err.stack,
  });
  process.exitCode = 1;
});
