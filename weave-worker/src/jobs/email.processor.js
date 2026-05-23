const { Resend } = require("resend");
const redis = require("../config/redis");
const { getEmailQueueRedisKey } = require("../config/redis-queue-keys");
const { DEV_SENDER, normalizeSenderFrom } = require("../services/email/sender-name");

class EmailProcessor {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (!process.env.RESEND_API_KEY) {
      console.warn("[Email Processor] RESEND_API_KEY is not defined. Email queue processor will exit.");
      return;
    }

    const queueName = getEmailQueueRedisKey();
    console.log(`[Email Processor] Listening for jobs on list: ${queueName}`);

    while (this.isRunning) {
      try {
        // block waiting for a job
        const result = await redis.blpop(queueName, 5);

        if (result) {
          const [, jobDataStr] = result;
          await this.processJob(JSON.parse(jobDataStr));
        }

      } catch (error) {
        console.error("[Email Processor] Error waiting for jobs or processing:", error);
        // small timeout to avoid tight loop on errors
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async processJob(jobData) {
    const { payload } = jobData;

    console.log(`[Email Processor] Processing email job to: ${payload.to.join(", ")}`);

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
        console.log(`[Email Processor] Retrying email with onboarding sender...`);
        ({ data, error } = await this.resend.emails.send({
          ...outbound,
          from: DEV_SENDER,
        }));
      }

      if (error) {
        const details = [error.message, error.name, error.statusCode]
          .filter(Boolean)
          .join(" | ");
        console.error(`[Email Processor] Resend API Error on job to ${payload.to.join(", ")}:`, details);
        return false;
      }

      console.log(`[Email Processor] Email successfully sent to ${payload.to.join(", ")}. Status ID:`, data?.id);
      return true;

    } catch (error) {
      console.error(`[Email Processor] Error processing email job for ${payload.to?.join(", ")}:`, error);
      return false;
    }
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new EmailProcessor();
