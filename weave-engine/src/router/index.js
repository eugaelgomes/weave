const redis = require("../services/cache/redis.client");
const { REDIS_QUEUES } = require("../services/cache/redis-queues");
const { logger } = require("../services/logger");
const chatProcessor = require("../modules/weave-ai-chat/chat.processor");
const proactiveProcessor = require("../modules/weave-ai-proactive/proactive.processor");

class QueueRouter {
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

  async start() {
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

        let parsedJob;
        try {
          parsedJob = processor.parseRawJob(rawPayload);
        } catch (error) {
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
      } catch (error) {
        logger.error("QueueRouter loop failed", { error: error.message });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async pushDeadLetter(deadLetterPayload) {
    try {
      await redis.rpush(
        REDIS_QUEUES.ENGINE_DEAD_LETTER.key,
        JSON.stringify({
          ...deadLetterPayload,
          createdAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      logger.error("Failed to push to dead letter queue", {
        error: error.message,
      });
    }
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new QueueRouter();
