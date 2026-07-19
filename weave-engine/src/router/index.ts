import redis from "../services/cache/redis.client";
import { REDIS_QUEUES } from "../services/cache/redis-queues";
import { logger } from "../services/logger";
import chatProcessor from "../modules/weave-ai-chat/chat.processor";
import proactiveProcessor from "../modules/weave-ai-proactive/proactive.processor";

interface DeadLetterPayload {
  errorCode: string;
  errorMessage: string;
  queueName: string;
  rawPayload: string;
}

class QueueRouter {
  private isRunning: boolean;
  private queueKeys: string[];
  private registry: Record<string, any>;

  constructor() {
    this.isRunning = false;
    this.queueKeys = [
      REDIS_QUEUES.ENGINE_LLM_REQUESTS.key,
      REDIS_QUEUES.ENGINE_PROACTIVE_TASKS.key,
    ];
    this.registry = {
      [REDIS_QUEUES.ENGINE_LLM_REQUESTS.key]: chatProcessor,
      [REDIS_QUEUES.ENGINE_PROACTIVE_TASKS.key]: proactiveProcessor,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info("Engine QueueRouter started", { queues: this.queueKeys });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueKeys, 5);
        if (!result) continue;

        const [queueName, rawPayload] = result;
        const processor = this.registry[queueName];

        if (!processor) {
          logger.warn("No processor mapped for queue", { queueName });
          continue;
        }

        let parsedJob: any;
        try {
          parsedJob = processor.parseRawJob(rawPayload);
        } catch (error: any) {
          logger.error("Failed to parse queue job", {
            error: error.message,
            queueName,
          });
          await this.pushDeadLetter({
            errorCode: "ENGINE_JOB_PARSE_FAILED",
            errorMessage: error.message,
            queueName,
            rawPayload,
          });
          continue;
        }

        await processor.processJob(parsedJob);
      } catch (error: any) {
        logger.error("QueueRouter loop failed", { error: error.message });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
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
    } catch (error: any) {
      logger.error("Failed to push to dead letter queue", {
        error: error.message,
      });
    }
  }

  stop(): void {
    this.isRunning = false;
  }
}

const queueRouter = new QueueRouter();
export default queueRouter;
