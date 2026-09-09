const { redisConsumer: redis } = require("@theweave/database");
const { getEmailQueueRedisKey } = require("../../queues/queue-queue-keys");
const { createMailService } = require("../../mail/sender");
const { logger } = require("@theweave/database");

class EmailProcessor {
  constructor() {
    this.mailService = createMailService();
    this.isRunning = false;
  }

  async verifyTransport() {
    return this.mailService.verify();
  }

  async start() {
    if (this.isRunning) return;
    await this.verifyTransport();
    this.isRunning = true;

    const queueName = getEmailQueueRedisKey();
    logger.info(`[Email Processor] Listening for jobs on list: ${queueName}`);

    while (this.isRunning) {
      try {
        // block waiting for a job
        const result = await redis.blpop(queueName, 5);

        if (result) {
          const [, jobDataStr] = result;
          await this.processJob(JSON.parse(jobDataStr));
        }
      } catch (error) {
        logger.error("[Email Processor] Error waiting for jobs or processing", { error });
        // small timeout to avoid tight loop on errors
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async processJob(jobData) {
    const { payload } = jobData;

    logger.info(`[Email Processor] Processing email job to: ${payload.to.join(", ")}`);

    try {
      const result = await this.mailService.sendMail(payload);

      logger.info(
        `[Email Processor] Email successfully sent to ${payload.to.join(", ")}. Status ID: ${result.id}`
      );
      return true;
    } catch (error) {
      logger.error(`[Email Processor] Error processing email job for ${payload.to?.join(", ")}`, {
        error,
      });
      return false;
    }
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new EmailProcessor();
