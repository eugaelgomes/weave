const redis = require("../../queues/queue-client");
const { executeQuery } = require("../../database/connection");
const { logger } = require("../../config/logger");
const { USAGE_PATHS } = require("./paths");
const {
  PLAN_USAGE_RETRY_INTERVAL_MS,
  getPlanUsageDelayedQueueRedisKey,
  getPlanUsageQueueRedisKey,
} = require("../../queues/queue-queue-keys");

const DUE_JOB_BATCH_SIZE = 100;
const DUE_JOB_POLL_INTERVAL_MS = 15 * 1000;

class PlansUsageProcessor {
  constructor() {
    this.isRunning = false;
    this.delayedQueueIntervalId = null;
  }

  toPgPath(dotPath) {
    return `{${dotPath.replace(/\./g, ",")}}`;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.queueName = getPlanUsageQueueRedisKey();
    this.delayedQueueName = getPlanUsageDelayedQueueRedisKey();

    this.delayedQueueIntervalId = setInterval(() => {
      this.moveDueDelayedJobs().catch((error) => {
        logger.error("Failed to move due plan usage jobs", {
          error: error.message,
        });
      });
    }, DUE_JOB_POLL_INTERVAL_MS);

    await this.moveDueDelayedJobs();

    logger.info("Plans usage processor started", {
      delayedQueue: this.delayedQueueName,
      queue: this.queueName,
      retryIntervalMs: PLAN_USAGE_RETRY_INTERVAL_MS,
    });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);
        if (!result) continue;

        const [, payload] = result;
        const job = JSON.parse(payload);
        await this.processJob(job);
      } catch (error) {
        logger.error("Plans usage processor loop failed", {
          error: error.message,
        });
      }
    }
  }

  async processJob(job) {
    const eventId = job?.eventId;
    const operation = job?.operation;
    const payload = job?.payload || {};
    const retryCount = Number(job?.retryCount || 0);
    const usageId = job?.usageId;

    if (!usageId || !operation) {
      logger.warn("Skipping invalid plans usage job", { job });
      return;
    }

    if (eventId) {
      const isNewEvent = await this.registerUsageEvent({
        eventId,
        operation,
        payload,
        usageId,
      });
      if (!isNewEvent) {
        logger.debug("Skipping duplicated plans usage event", {
          eventId,
          usageId,
        });
        return;
      }
    }

    try {
      if (operation === "consume_note_creation") {
        const amount = Number(payload.amount || 1);
        await this.incrementUsage(usageId, USAGE_PATHS.SUMMARY.NOTES_TOTAL, amount);
        return;
      }

      if (operation === "consume_project_creation") {
        const amount = Number(payload.amount || 1);
        await this.incrementUsage(
          usageId,
          USAGE_PATHS.SUMMARY.PROJECTS_TOTAL,
          amount
        );
        return;
      }

      if (operation === "consume_ai_message") {
        const tokens = Number(payload.tokens || 0);
        const reasoningLevel = payload.reasoningLevel || "none";
        const filesCount = Number(payload.filesCount || 0);

        await this.incrementUsage(
          usageId,
          USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT,
          1
        );
        if (tokens > 0) {
          await this.incrementUsage(
            usageId,
            USAGE_PATHS.MONTHLY.WEAVE_AI.TOKENS_ESTIMATED,
            tokens
          );
        }

        if (reasoningLevel && reasoningLevel !== "none") {
          const reasoningPath = USAGE_PATHS.MONTHLY.WEAVE_AI[`REASONING_${reasoningLevel.toUpperCase()}_SENT`];
          if (reasoningPath) {
            await this.incrementUsage(usageId, reasoningPath, 1);
          }
        }

        if (filesCount > 0) {
          await this.incrementUsage(
            usageId,
            USAGE_PATHS.MONTHLY.WEAVE_AI.FILES_ANALYZED,
            filesCount
          );
        }

        return;
      }

      if (operation === "consume_storage") {
        const fileSizeMb = Number(payload.fileSizeMb || 0);
        await this.incrementUsage(usageId, USAGE_PATHS.MONTHLY.STORAGE.FILES_COUNT, 1);
        await this.incrementUsage(
          usageId,
          USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB,
          fileSizeMb
        );
        return;
      }

      if (operation === "consume_export") {
        const type = payload.type === "backup" ? "backup" : "notes";
        const path =
          type === "backup"
            ? USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
            : USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT;
        await this.incrementUsage(usageId, path, 1);
        return;
      }

      logger.warn("Unknown plans usage operation. Job dropped", {
        operation,
        usageId,
      });
    } catch (error) {
      logger.error("Failed to process plans usage job, scheduling retry", {
        error: error.message,
        operation,
        retryCount,
        usageId,
      });

      if (eventId) {
        await this.rollbackUsageEvent(eventId);
      }

      await this.scheduleRetry({
        eventId,
        operation,
        payload,
        retryCount: retryCount + 1,
        usageId,
      });
    }
  }

  async incrementUsage(usageId, dotPath, amount = 1) {
    const jsonPath = this.toPgPath(dotPath);
    const isNote = jsonPath.includes("notes_total");
    const isAI = jsonPath.includes("messages_sent");
    const isStorage = jsonPath.includes("storage");
    const castType = isStorage ? "numeric" : "int";

    const query = `
      UPDATE plan_usages
      SET
        usage_details = jsonb_set(
          usage_details,
          $1,
          ((COALESCE(usage_details #>> $1, '0')::${castType}) + $2)::text::jsonb
        ),
        ${
          isNote
            ? "lifetime_stats = jsonb_set(lifetime_stats, '{total_notes_ever}', ((COALESCE(lifetime_stats->>'total_notes_ever', '0')::int) + $2)::text::jsonb),"
            : ""
        }
        ${
          isAI
            ? "lifetime_stats = jsonb_set(lifetime_stats, '{total_ai_messages_ever}', ((COALESCE(lifetime_stats->>'total_ai_messages_ever', '0')::int) + $2)::text::jsonb),"
            : ""
        }
        updated_at = NOW()
      WHERE id = $3
      RETURNING id;
    `;

    const results = await executeQuery(query, [jsonPath, amount, usageId]);
    if (!results[0]) {
      throw new Error(`plan_usage not found: ${usageId}`);
    }
  }

  async registerUsageEvent({ eventId, operation, payload, usageId }) {
    const rows = await executeQuery(
      `
        INSERT INTO usage_events (
          event_id,
          operation,
          payload,
          plan_usage_id,
          processed_at
        )
        VALUES ($1, $2, $3::jsonb, $4, NOW())
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      `,
      [eventId, operation, JSON.stringify(payload || {}), usageId]
    );
    return Boolean(rows[0]);
  }

  async rollbackUsageEvent(eventId) {
    await executeQuery("DELETE FROM usage_events WHERE event_id = $1", [eventId]);
  }

  async moveDueDelayedJobs() {
    const dueJobs = await redis.zrangebyscore(
      this.delayedQueueName,
      0,
      Date.now(),
      "LIMIT",
      0,
      DUE_JOB_BATCH_SIZE
    );

    if (dueJobs.length === 0) return;

    const pipeline = redis.pipeline();
    for (const jobPayload of dueJobs) {
      pipeline.zrem(this.delayedQueueName, jobPayload);
      pipeline.lpush(this.queueName, jobPayload);
    }
    await pipeline.exec();
  }

  async scheduleRetry(job) {
    const runAt = Date.now() + PLAN_USAGE_RETRY_INTERVAL_MS;
    await redis.zadd(this.delayedQueueName, runAt, JSON.stringify(job));
  }

  stop() {
    this.isRunning = false;
    if (this.delayedQueueIntervalId) {
      clearInterval(this.delayedQueueIntervalId);
      this.delayedQueueIntervalId = null;
    }
  }
}

module.exports = new PlansUsageProcessor();
