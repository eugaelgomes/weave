import redis from "@/queues/redis.client";
import { REDIS_QUEUES } from "@/queues/redis-queues";
import { logger } from "@/config/logger";
import chatProcessor from "@/modules/weave-ai-chat/chat.processor";
import proactiveProcessor from "@/modules/weave-ai-proactive/proactive.processor";

interface DeadLetterPayload {
  errorCode: string;
  errorMessage: string;
  queueName: string;
  rawPayload: string;
}

class QueueRouter {
  private isRunning: boolean;
  private isShuttingDown: boolean;
  private queueKeys: string[];
  private registry: Record<string, unknown>;
  private activeJobs: Set<Promise<void>>;
  private maxConcurrentJobs: number;

  constructor() {
    this.isRunning = false;
    this.isShuttingDown = false;
    this.queueKeys = [
      REDIS_QUEUES.ENGINE_LLM_REQUESTS.key,
      REDIS_QUEUES.ENGINE_PROACTIVE_TASKS.key,
    ];
    this.registry = {
      [REDIS_QUEUES.ENGINE_LLM_REQUESTS.key]: chatProcessor,
      [REDIS_QUEUES.ENGINE_PROACTIVE_TASKS.key]: proactiveProcessor,
    };
    this.activeJobs = new Set();
    this.maxConcurrentJobs = parseInt(
      process.env.ENGINE_MAX_CONCURRENT_JOBS || "5",
      10
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info("Engine QueueRouter started", {
      maxConcurrent: this.maxConcurrentJobs,
      queues: this.queueKeys,
    });

    while (this.isRunning && !this.isShuttingDown) {
      if (this.activeJobs.size >= this.maxConcurrentJobs) {
        try {
          await Promise.race(this.activeJobs);
        } catch {
          // Errors are handled in processJobSafe
        }
        continue;
      }

      try {
        const result = await redis.blpop(this.queueKeys, 1);
        if (!result) continue;

        const [queueName, rawPayload] = result;
        const processor = this.registry[queueName];

        if (!processor) {
          logger.warn("No processor mapped for queue", { queueName });
          continue;
        }

        let parsedJob: unknown;
        try {
          parsedJob = processor.parseRawJob(rawPayload);
        } catch (error: unknown) {
          logger.error("Failed to parse queue job", {
            error: (error as Error).message,
            queueName,
          });
          await this.pushDeadLetter({
            errorCode: "ENGINE_JOB_PARSE_FAILED",
            errorMessage: (error as Error).message,
            queueName,
            rawPayload,
          });
          continue;
        }

        const jobPromise = this.processJobSafe(
          processor,
          parsedJob,
          queueName,
          rawPayload
        );
        this.activeJobs.add(jobPromise);
        jobPromise.finally(() => {
          this.activeJobs.delete(jobPromise);
        });
      } catch (error: unknown) {
        logger.error("QueueRouter loop failed", { error: (error as Error).message });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (this.activeJobs.size > 0) {
      logger.info(`Waiting for ${this.activeJobs.size} active jobs to finish...`);
      await Promise.allSettled(this.activeJobs);
    }

    this.isRunning = false;
    logger.info("QueueRouter stopped gracefully");
  }

  private async processJobSafe(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processor: any,
    parsedJob: unknown,
    queueName: string,
    rawPayload: string
  ): Promise<void> {
    try {
      await processor.processJob(parsedJob);
    } catch (error: unknown) {
      logger.error("Job processing failed", {
        error: (error as Error).message,
        queueName,
      });
      await this.pushDeadLetter({
        errorCode: "ENGINE_JOB_PROCESS_FAILED",
        errorMessage: error.message,
        queueName,
        rawPayload,
      });
    }
  }

  async pushDeadLetter(deadLetterPayload: DeadLetterPayload): Promise<void> {
    try {
      await redis.rpush(
        REDIS_QUEUES.ENGINE_DEAD_LETTER.key,
        JSON.stringify({
          ...deadLetterPayload,
          createdAt: new Date().toISOString(),
        })
      );
    } catch (error: unknown) {
      logger.error("Failed to push to dead letter queue", {
        error: (error as Error).message,
      });
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    logger.info("Initiating graceful shutdown of QueueRouter...");
    this.isShuttingDown = true;

    // wait until start loop finishes and isRunning is flipped to false
    while (this.isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

const queueRouter = new QueueRouter();
export default queueRouter;
