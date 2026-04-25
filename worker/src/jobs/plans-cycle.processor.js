const { getConnection } = require("../database/connection");
const { logger } = require("../lib");
const { USAGE_PATHS } = require("../services/plans/paths");

const CYCLE_CHECK_INTERVAL_MS = 60 * 1000;
const DUE_CYCLE_BATCH_SIZE = 100;

class PlansCycleProcessor {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * @param {object} obj
   * @param {string} path
   * @returns {*}
   */
  getNestedValue(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.processDueCycles();

    this.intervalId = setInterval(() => {
      this.processDueCycles().catch((error) => {
        logger.error("Failed to process due plan cycles", {
          error: error.message,
        });
      });
    }, CYCLE_CHECK_INTERVAL_MS);

    logger.info("Plans cycle processor started", {
      checkIntervalMs: CYCLE_CHECK_INTERVAL_MS,
    });
  }

  async processDueCycles() {
    const client = await getConnection();
    try {
      const { rows } = await client.query(
        `
          SELECT id, plan_id, user_id, organization_id, usage_details
          FROM plan_usages
          WHERE (
            usage_details #>> '{monthly_cycle,current_period_end}'
          )::timestamptz <= NOW()
          ORDER BY (
            usage_details #>> '{monthly_cycle,current_period_end}'
          )::timestamptz ASC
          LIMIT $1
        `,
        [DUE_CYCLE_BATCH_SIZE]
      );

      if (rows.length === 0) return;

      for (const usageRecord of rows) {
        await this.rolloverUsageCycle(usageRecord);
      }

      logger.info("Processed due plan cycles", { total: rows.length });
    } finally {
      client.release();
    }
  }

  /**
   * @param {object} usageRecord
   * @returns {Promise<void>}
   */
  async rolloverUsageCycle(usageRecord) {
    const client = await getConnection();
    try {
      await client.query("BEGIN");

      const { rows: lockRows } = await client.query(
        `
          SELECT id, plan_id, user_id, organization_id, usage_details, lifetime_stats
          FROM plan_usages
          WHERE id = $1
          FOR UPDATE
        `,
        [usageRecord.id]
      );

      const current = lockRows[0];
      if (!current) {
        await client.query("ROLLBACK");
        return;
      }

      const oldDetails = current.usage_details;
      const periodStart = this.getNestedValue(
        oldDetails,
        USAGE_PATHS.MONTHLY.PERIOD_START
      );
      const periodEnd = this.getNestedValue(
        oldDetails,
        USAGE_PATHS.MONTHLY.PERIOD_END
      );

      if (!periodEnd || new Date(periodEnd) > new Date()) {
        await client.query("ROLLBACK");
        return;
      }

      const notesTotal =
        this.getNestedValue(oldDetails, USAGE_PATHS.SUMMARY.NOTES_TOTAL) || 0;
      const projectsTotal =
        this.getNestedValue(oldDetails, USAGE_PATHS.SUMMARY.PROJECTS_TOTAL) || 0;
      const aiMessages =
        this.getNestedValue(oldDetails, USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT) ||
        0;
      const storageMb =
        this.getNestedValue(
          oldDetails,
          USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB
        ) || 0;
      const totalExports =
        (this.getNestedValue(oldDetails, USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT) ||
          0) +
        (this.getNestedValue(
          oldDetails,
          USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        ) || 0);

      await client.query(
        `
          INSERT INTO plan_usage_history
            (plan_usage_id, user_id, organization_id, plan_id, period_start, period_end,
             final_usage_details, total_notes_created, total_projects_created,
             total_ai_messages, total_storage_mb, total_exports)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          current.id,
          current.user_id,
          current.organization_id,
          current.plan_id,
          periodStart,
          periodEnd,
          oldDetails,
          notesTotal,
          projectsTotal,
          aiMessages,
          storageMb,
          totalExports,
        ]
      );

      const now = new Date();
      const nextPeriodEnd = new Date(now);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);

      const updatedDetails = {
        ...oldDetails,
        monthly_cycle: {
          current_period_start: now.toISOString(),
          current_period_end: nextPeriodEnd.toISOString(),
          exports: { backups_count: 0, notes_count: 0 },
          storage: { files_count: 0, total_uploaded_mb: 0 },
          weave_ai: { messages_sent: 0, tokens_estimated: 0 },
        },
      };

      await client.query(
        `
          UPDATE plan_usages
          SET
            usage_details = $1,
            lifetime_stats = jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(lifetime_stats, '{}'::jsonb),
                    '{total_notes_ever}',
                    to_jsonb(COALESCE((lifetime_stats->>'total_notes_ever')::int, 0) + $2)
                  ),
                  '{total_projects_ever}',
                  to_jsonb(COALESCE((lifetime_stats->>'total_projects_ever')::int, 0) + $3)
                ),
                '{total_ai_messages_ever}',
                to_jsonb(COALESCE((lifetime_stats->>'total_ai_messages_ever')::int, 0) + $4)
              ),
              '{total_storage_used_mb}',
              to_jsonb(COALESCE((lifetime_stats->>'total_storage_used_mb')::numeric, 0) + $5)
            ),
            last_reset_at = $6,
            updated_at = NOW()
          WHERE id = $7
        `,
        [
          updatedDetails,
          notesTotal,
          projectsTotal,
          aiMessages,
          storageMb,
          now,
          current.id,
        ]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Failed to rollover plan usage cycle", {
        error: error.message,
        usageId: usageRecord.id,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

module.exports = new PlansCycleProcessor();
