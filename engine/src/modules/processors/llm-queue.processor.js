const redis = require("../../config/redis");
const {
  getEngineLlmRequestQueueRedisKey,
} = require("../../config/redis-queue-keys");
const { logger } = require("../../lib");
const {
  buildSystemMessage,
  getFewShotExamples,
} = require("../prompts/agent-prompts");
const {
  generateSmartResponse,
  processThinkingPhase,
} = require("../orchestration/reasoning.engine");
const { callAIProvider } = require("../llm/providers/llm-provider.client");

const RESPONSE_TTL_SECONDS = 60;

class LlmQueueProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = getEngineLlmRequestQueueRedisKey();
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info("Engine LLM processor started", { queueName: this.queueName });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);

        if (!result) {
          continue;
        }

        const [, payload] = result;
        await this.processJob(JSON.parse(payload));
      } catch (error) {
        logger.error("Engine LLM processor loop failed", {
          error: error.message,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * @param {object} job
   * @param {object} [job.payload]
   * @param {string} job.responseQueueKey
   * @param {string} [job.taskType]
   * @returns {Promise<void>}
   */
  async processJob(job) {
    const { payload = {}, responseQueueKey, taskType = "provider_call" } = job;

    if (!responseQueueKey) {
      logger.warn("Engine LLM job discarded: missing response queue key");
      return;
    }

    let responsePayload;

    try {
      const data = await this.executeTask(taskType, payload);
      responsePayload = JSON.stringify({
        data,
        success: true,
      });
    } catch (error) {
      responsePayload = JSON.stringify({
        error: error.message,
        success: false,
      });
    }

    await redis.lpush(responseQueueKey, responsePayload);
    await redis.expire(responseQueueKey, RESPONSE_TTL_SECONDS);
  }

  /**
   * @param {string} taskType
   * @param {object} payload
   * @returns {Promise<object>}
   */
  async executeTask(taskType, payload) {
    switch (taskType) {
      case "build_system_message":
        return {
          systemMessage: buildSystemMessage(payload.useCase, payload.additionalContext),
        };

      case "generate_smart_response":
        return {
          smartResponse: await generateSmartResponse(payload),
        };

      case "get_few_shot_examples":
        return {
          examples: getFewShotExamples(payload.useCase),
        };

      case "process_thinking_phase":
        return {
          generatedContent: await processThinkingPhase(payload),
        };

      case "provider_call":
      default: {
        const { data, provider: providerUsed } = await callAIProvider(payload);
        return {
          ...data,
          providerUsed,
        };
      }
    }
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new LlmQueueProcessor();
