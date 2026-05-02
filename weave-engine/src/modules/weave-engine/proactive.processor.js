const redis = require("../../services/redis.client");
const { logger } = require("../../logger");
// We can import orchestration logic from core if needed later
// const { executeAgenticTask } = require("../core/orchestration/reasoning.engine");

class ProactiveQueueProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = "queue:engine-proactive-tasks"; // Can be dynamic or configured later
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info("Engine Proactive processor started", {
      queueName: this.queueName,
    });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);

        if (!result) {
          continue;
        }

        const [, payload] = result;
        await this.processJob(JSON.parse(payload));
      } catch (error) {
        logger.error("Engine Proactive processor loop failed", {
          error: error.message,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async processJob(job) {
    logger.info("Received proactive job", { jobType: job.type });
    // In the future, dispatch to Insights Generator, Notifications, etc.
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new ProactiveQueueProcessor();
