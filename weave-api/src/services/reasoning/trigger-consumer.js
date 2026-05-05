const redis = require("@/services/queue/connection");
const { getReasoningTriggerQueueRedisKey } = require("@/services/queue/queue-keys");
const sprintContextBuilder = require("./sprint-context-builder");

const ENGINE_PROACTIVE_QUEUE = "queue:engine-proactive-tasks";

class ReasoningTriggerConsumer {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const queueKey = getReasoningTriggerQueueRedisKey();
    console.log(`[Reasoning Trigger Consumer] Listening on: ${queueKey}`);

    while (this.isRunning) {
      try {
        const result = await redis.blpop(queueKey, 0);

        if (result) {
          const [, payloadStr] = result;
          await this.processTrigger(JSON.parse(payloadStr));
        }
      } catch (error) {
        console.error("[Reasoning Trigger Consumer] Error in loop:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Processes a reasoning trigger from the worker:
   * 1. Fetches all necessary data (notes, blocks, members).
   * 2. Builds markdown context.
   * 3. Pushes the full job to the Engine.
   *
   * @param {object} trigger
   */
  async processTrigger(trigger) {
    const { projectId, reportType, config } = trigger;

    console.log(`[Reasoning Trigger Consumer] Building context for project: ${projectId}, type: ${reportType}`);

    try {
      // 1. Build context (Data fetching happens here in the API)
      const context = await sprintContextBuilder.build(config);

      // 2. Prepare Engine Job
      const job = {
        ...trigger,
        inputContext: context,
        // The response will go to the response queue that ReasoningResponseConsumer listens to
        responseQueueKey: "queue:engine-proactive-responses",
        createdAt: new Date().toISOString(),
      };

      // 3. Push to Engine
      await redis.rpush(ENGINE_PROACTIVE_QUEUE, JSON.stringify(job));
      console.log(`[Reasoning Trigger Consumer] Job pushed to engine for project: ${projectId}`);
      
    } catch (error) {
      console.error("[Reasoning Trigger Consumer] Failed to process trigger:", error);
    }
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new ReasoningTriggerConsumer();
