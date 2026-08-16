const { Resend } = require("resend");
const redis = require("../../queues/queue-client");
const { getEmailQueueRedisKey } = require("../../queues/queue-queue-keys");
const { DEV_SENDER, normalizeSenderFrom } = require("../../mail/sender-name");
const { logger } = require("@theweave/database");

class EmailProcessor {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (!process.env.RESEND_API_KEY) {
      logger.warn(
        "[Email Processor] RESEND_API_KEY is not defined. Email queue processor will exit."
      );
      return;
    }

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
      const outbound = {
        ...payload,
        from: normalizeSenderFrom(payload.from),
      };

      let { data, error } = await this.resend.emails.send(outbound);

      const errorMessage = error?.message || "";
      const shouldRetryWithOnboardingSender =
        process.env.NODE_ENV !== "production" &&
        outbound.from !== DEV_SENDER &&
        /domain|verify|verified/i.test(errorMessage);

      if (shouldRetryWithOnboardingSender) {
        logger.info("[Email Processor] Retrying email with onboarding sender...");
        ({ data, error } = await this.resend.emails.send({
          ...outbound,
          from: DEV_SENDER,
        }));
      }

      if (error) {
        const details = [error.message, error.name, error.statusCode].filter(Boolean).join(" | ");
        logger.error(
          `[Email Processor] Resend API Error on job to ${payload.to.join(", ")}: ${details}`,
          { error }
        );
        return false;
      }

      logger.info(
        `[Email Processor] Email successfully sent to ${payload.to.join(", ")}. Status ID: ${data?.id}`
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
