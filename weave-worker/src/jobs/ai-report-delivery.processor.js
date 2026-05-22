const redis = require("../config/redis");
const { getAiReportDeliveryQueueRedisKey, getEmailQueueRedisKey } = require("../config/redis-queue-keys");
const { executeQuery } = require("../database/connection");
const { logger } = require("../lib");
const { buildAiReportEmail } = require("../services/email/templates/ai-report");
const { localeFromUserPreference } = require("../services/email/i18n");

class AiReportDeliveryProcessor {
  constructor() {
    this.isRunning = false;
    this.queueName = getAiReportDeliveryQueueRedisKey();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    logger.info("AI Report Delivery processor started", { queueName: this.queueName });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 0);

        if (result) {
          const [, jobDataStr] = result;
          await this.processJob(JSON.parse(jobDataStr));
        }
      } catch (error) {
        logger.error("AI Report Delivery processor error:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  async processJob(jobData) {
    const { payload } = jobData;
    const { reasoningId, projectId, reasoningType, title, outputMarkdown, recipientScope, customRecipients } = payload;

    logger.info("Processing AI report delivery", { reasoningId, projectId });

    try {
      const recipients = await this._getRecipients(projectId, recipientScope, customRecipients);

      if (recipients.length === 0) {
        logger.warn("No recipients found for AI report delivery", { reasoningId, recipientScope });
        return;
      }

      const emailQueueKey = getEmailQueueRedisKey();
      const projectTitle = title.split(" - ")[1] || title || "Project Report";

      for (const recipient of recipients) {
        const locale = localeFromUserPreference(recipient.user_preference);

        const { html, text, subject } = buildAiReportEmail({
          locale,
          reportType: reasoningType,
          projectTitle,
          outputMarkdown,
          projectId,
          reasoningId,
          recipientName: recipient.name,
        });

        const emailJob = {
          payload: {
            to: [recipient.email],
            subject,
            html,
            text,
          },
        };

        await redis.rpush(emailQueueKey, JSON.stringify(emailJob));
      }

      logger.info("AI report delivery finished: queued individual emails", {
        reasoningId,
        count: recipients.length,
      });
    } catch (error) {
      logger.error("Failed to process AI report delivery job", { reasoningId, error: error.message });
      throw error;
    }
  }

  async _getRecipients(projectId, scope, customIds) {
    if (scope === "owner_only") {
      return executeQuery(
        `SELECT u.email, u.name, u.user_preference FROM users u 
         INNER JOIN projects p ON p.user_id = u.user_id 
         WHERE p.id = $1`,
        [projectId]
      );
    }

    if (scope === "custom" && Array.isArray(customIds) && customIds.length > 0) {
      return executeQuery(
        `SELECT u.email, u.name, u.user_preference FROM users u WHERE u.user_id = ANY($1::uuid[])`,
        [customIds]
      );
    }

    return executeQuery(
      `SELECT DISTINCT u.email, u.name, u.user_preference
      FROM project_members pm
      INNER JOIN users u ON u.user_id = pm.user_id
      WHERE pm.project_id = $1
        AND pm.deleted = false
        AND pm.suspended = false
      UNION
      SELECT u.email, u.name, u.user_preference
      FROM users u
      INNER JOIN projects p ON p.user_id = u.user_id
      WHERE p.id = $1 AND p.deleted = false`,
      [projectId]
    );
  }

  stop() {
    this.isRunning = false;
  }
}

module.exports = new AiReportDeliveryProcessor();
