const { getConnection } = require("../../database/connection");
const { logger } = require("../../config/logger");
const { USAGE_PATHS } = require("./paths");

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
          SELECT
            id,
            plan_id,
            user_id,
            organization_id,
            usage_details,
            subscriber_type,
            subscriber_id,
            applied_plan_snapshot,
            applied_plan_version
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
          SELECT
            id,
            plan_id,
            user_id,
            organization_id,
            usage_details,
            lifetime_stats,
            subscriber_type,
            subscriber_id,
            applied_plan_snapshot,
            applied_plan_version
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
            (
              plan_usage_id,
              user_id,
              organization_id,
              plan_id,
              period_start,
              period_end,
              final_usage_details,
              applied_plan_snapshot,
              applied_plan_version,
              total_notes_created,
              total_projects_created,
              total_ai_messages,
              total_storage_mb,
              total_exports
            )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
        [
          current.id,
          current.user_id,
          current.organization_id,
          current.plan_id,
          periodStart,
          periodEnd,
          oldDetails,
          current.applied_plan_snapshot || {},
          current.applied_plan_version || 1,
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
      const effectivePlan = await this.resolveEffectivePlanForSubscriber(client, {
        currentPlanId: current.plan_id,
        subscriberId: current.subscriber_id,
        subscriberType: current.subscriber_type,
      });

      const updatedDetails = {
        ...oldDetails,
        monthly_cycle: {
          current_period_end: nextPeriodEnd.toISOString(),
          current_period_start: now.toISOString(),
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
            plan_id = $2,
            applied_plan_snapshot = $3,
            applied_plan_version = $4,
            lifetime_stats = jsonb_set(
              jsonb_set(
                jsonb_set(
                  jsonb_set(
                    COALESCE(lifetime_stats, '{}'::jsonb),
                    '{total_notes_ever}',
                    to_jsonb(COALESCE((lifetime_stats->>'total_notes_ever')::int, 0) + $5)
                  ),
                  '{total_projects_ever}',
                  to_jsonb(COALESCE((lifetime_stats->>'total_projects_ever')::int, 0) + $6)
                ),
                '{total_ai_messages_ever}',
                to_jsonb(COALESCE((lifetime_stats->>'total_ai_messages_ever')::int, 0) + $7)
              ),
              '{total_storage_used_mb}',
              to_jsonb(COALESCE((lifetime_stats->>'total_storage_used_mb')::numeric, 0) + $8)
            ),
            last_reset_at = $9,
            updated_at = NOW()
          WHERE id = $10
        `,
        [
          updatedDetails,
          effectivePlan.planId,
          effectivePlan.snapshot,
          effectivePlan.version,
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

  /**
   * @param {import("pg").PoolClient} client
   * @param {{ subscriberType: string, subscriberId: string, currentPlanId: string }} params
   * @returns {Promise<{ planId: string, snapshot: object, version: number }>}
   */
  async resolveEffectivePlanForSubscriber(
    client,
    { subscriberType, subscriberId, currentPlanId }
  ) {
    if (!subscriberType || !subscriberId) {
      const fallback = await this.getPlanById(client, currentPlanId);
      return {
        planId: fallback.plan_id,
        snapshot: fallback.details || {},
        version: fallback.plan_version || 1,
      };
    }

    const { rows: subsRows } = await client.query(
      `
        SELECT plan_id, cancel_at_period_end, status
        FROM subscriptions
        WHERE subscriber_type = $1
          AND subscriber_id = $2
          AND status IN ('active', 'past_due', 'trialing')
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [subscriberType, subscriberId]
    );

    const sub = subsRows[0];
    if (sub?.cancel_at_period_end) {
      logger.info("Subscription cancel_at_period_end triggered", {
        subscriberId,
        subscriberType,
      });
      const freePlan = await this.getDefaultFreePlan(client);

      await client.query(
        `UPDATE subscriptions
         SET status = 'canceled', plan_id = $3, cancel_at_period_end = false, updated_at = NOW()
         WHERE subscriber_type = $1 AND subscriber_id = $2
           AND status IN ('active', 'past_due', 'trialing')`,
        [subscriberType, subscriberId, freePlan.plan_id]
      );

      if (subscriberType === "user") {
        await client.query(
          `UPDATE users SET plan_id = $1, updated_at = NOW() WHERE user_id = $2`,
          [freePlan.plan_id, subscriberId]
        );
      } else {
        await client.query(
          `UPDATE organizations SET plan_id = $1, updated_at = NOW() WHERE id = $2`,
          [freePlan.plan_id, subscriberId]
        );
      }

      const override = await this.getPlanOverride(client, {
        planId: freePlan.plan_id,
        subscriberId,
        subscriberType,
      });
      const snapshot = this.mergeDeep(freePlan.details || {}, override || {});
      return {
        planId: freePlan.plan_id,
        snapshot,
        version: freePlan.plan_version || 1,
      };
    }

    const planId = sub?.plan_id || currentPlanId;
    const plan = await this.getPlanById(client, planId);
    const override = await this.getPlanOverride(client, {
      planId,
      subscriberId,
      subscriberType,
    });
    const snapshot = this.mergeDeep(plan.details || {}, override || {});

    return {
      planId,
      snapshot,
      version: plan.plan_version || 1,
    };
  }

  async getDefaultFreePlan(client) {
    const { rows } = await client.query(`
      SELECT plan_id, details, plan_version
      FROM plans
      WHERE deleted = FALSE AND is_active = TRUE
        AND COALESCE((details #>> '{metadata,is_signup_default}')::boolean, false) = true
      ORDER BY COALESCE(plan_value, 0) ASC
      LIMIT 1
    `);
    if (rows[0]) return rows[0];
    const { rows: fallback } = await client.query(`
      SELECT plan_id, details, plan_version
      FROM plans
      WHERE deleted = FALSE AND is_active = TRUE
      ORDER BY COALESCE(plan_value, 0) ASC
      LIMIT 1
    `);
    return fallback[0] || { details: {}, plan_id: null, plan_version: 1 };
  }

  async getPlanById(client, planId) {
    const { rows } = await client.query(
      `
        SELECT plan_id, details, plan_version
        FROM plans
        WHERE plan_id = $1
        LIMIT 1
      `,
      [planId]
    );
    return rows[0] || { details: {}, plan_id: planId, plan_version: 1 };
  }

  async getPlanOverride(client, { planId, subscriberType, subscriberId }) {
    const { rows } = await client.query(
      `
        SELECT override_details
        FROM plan_limit_overrides
        WHERE plan_id = $1
          AND subscriber_type = $2
          AND subscriber_id = $3
          AND is_active = true
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at >= NOW())
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [planId, subscriberType, subscriberId]
    );
    return rows[0]?.override_details || null;
  }

  mergeDeep(base = {}, override = {}) {
    const output = { ...(base || {}) };
    for (const [key, value] of Object.entries(override || {})) {
      const current = output[key];
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        current &&
        typeof current === "object" &&
        !Array.isArray(current)
      ) {
        output[key] = this.mergeDeep(current, value);
      } else {
        output[key] = value;
      }
    }
    return output;
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
