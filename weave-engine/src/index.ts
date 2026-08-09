import "./instrument";
import { validateEnv, env } from "@/config/enviroments";
import { logger } from "@/config/logger";
import {
  registerShutdownHandler,
  setupGracefulShutdown,
} from "@/config/shutdown";
import redis from "@/queues/redis.client";
import queueRouter from "@/worker/queue-router";
import * as Sentry from "@sentry/node";

async function bootstrap() {
  logger.info("weave-engine starting", { env: env.NODE_ENV });

  validateEnv();
  logger.info("Environment validated");

  queueRouter.start().catch((err: unknown) => {
    logger.error("QueueRouter loop failed fatally", { error: (err as Error).message });
  });

  registerShutdownHandler("queue-router", async () => {
    queueRouter.stop();
  });
  registerShutdownHandler("redis", async () => {
    await redis.quit();
  });
  registerShutdownHandler("sentry", async () => {
    await Sentry.close(2000);
  });

  logger.info("weave-engine ready");
}

setupGracefulShutdown();

bootstrap().catch((err: unknown) => {
  logger.error("Failed to start weave-engine", {
    error: (err as Error).message,
    stack: (err as Error).stack,
  });
  process.exitCode = 1;
});

