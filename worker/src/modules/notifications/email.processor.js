const { redisConsumer: redis } = require("@theweave/database");
const {
  getEmailQueueRedisKey,
  getTransactionalEmailQueueRedisKey,
} = require("../../queues/queue-queue-keys");
const { createMailService } = require("../../mail/sender");
const { logger } = require("@theweave/database");

const DEFAULT_CONCURRENCY = 5;
const MAX_CONCURRENCY = 5;

function getConcurrency() {
  const configured = Number.parseInt(process.env.EMAIL_DELIVERY_CONCURRENCY, 10);
  if (!Number.isInteger(configured)) return DEFAULT_CONCURRENCY;
  return Math.min(Math.max(configured, 1), MAX_CONCURRENCY);
}

class EmailProcessor {
  constructor() {
    this.mailService = createMailService();
    this.isRunning = false;
    this.consumers = [];
  }

  async verifyTransport() {
    return this.mailService.verify();
  }

  async start() {
    if (this.isRunning) return;
    await this.verifyTransport();
    this.isRunning = true;

    const queueNames = [getTransactionalEmailQueueRedisKey(), getEmailQueueRedisKey()];
    const concurrency = getConcurrency();
    this.consumers = Array.from({ length: concurrency }, () => redis.duplicate());

    logger.info("[Email Processor] Listening for jobs", { concurrency, queueNames });

    for (const consumer of this.consumers) {
      this.consume(consumer, queueNames).catch((error) => {
        logger.error("[Email Processor] Consumer stopped unexpectedly", { error });
      });
    }
  }

  async consume(consumer, queueNames) {
    while (this.isRunning) {
      try {
        // Transactional login and verification codes are checked first.
        const result = await consumer.blpop(queueNames, 5);

        if (result) {
          const [queueName, jobDataStr] = result;
          logger.debug("[Email Processor] Dequeued email", { queueName });
          await this.processJob(JSON.parse(jobDataStr));
        }
      } catch (error) {
        if (!this.isRunning) break;
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
    for (const consumer of this.consumers) {
      consumer.disconnect();
    }
    this.consumers = [];
  }
}

module.exports = new EmailProcessor();
