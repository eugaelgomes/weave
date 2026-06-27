const { executeQuery } = require("@/database/connection");

class PlansRepository {
  /**
   * @param {Record<string, any>} base
   * @param {Record<string, any>} override
   * @returns {Record<string, any>}
   */
  mergePlanDetails(base = {}, override = {}) {
    if (!override || typeof override !== "object") {
      return base || {};
    }

    const output = { ...(base || {}) };
    for (const [key, value] of Object.entries(override)) {
      const current = output[key];
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        current &&
        typeof current === "object" &&
        !Array.isArray(current)
      ) {
        output[key] = this.mergePlanDetails(current, value);
      } else {
        output[key] = value;
      }
    }
    return output;
  }

  // ==========================================
  // Query with all plans (not-deleted)
  // ==========================================
  async getAllPlans() {
    const query = `
        SELECT plan_id, name, details, created_at
        FROM plans 
        WHERE deleted = FALSE
        ORDER BY name ASC
      `;
    return await executeQuery(query);
  }

  async getPlanById(planId) {
    const query = `
    SELECT plan_id, name, details, plan_version, created_at 
    FROM plans 
    WHERE plan_id = $1
      `;
    const results = await executeQuery(query, [planId]);
    return results[0];
  }

  async getPlanByName(name) {
    const query = `
    SELECT plan_id, name, details, plan_version, created_at
    FROM plans
    WHERE LOWER(name) = LOWER($1) AND deleted = FALSE
    LIMIT 1
      `;
    const results = await executeQuery(query, [name]);
    return results[0];
  }

  /**
   * Default signup plan.
   * Prioritizes plans explicitly marked as default in details.metadata.is_signup_default.
   * Falls back to the cheapest active plan when no default flag is present.
   */
  async getDefaultSignupPlanId() {
    const query = `
      WITH candidates AS (
        SELECT plan_id
             , 1 AS priority
             , COALESCE(plan_value, 0) AS sort_value
             , created_at
        FROM plans
        WHERE deleted = FALSE
          AND is_active = TRUE
          AND COALESCE((details #>> '{metadata,is_signup_default}')::boolean, false) = true
        UNION ALL
      SELECT plan_id
           , 2 AS priority
           , COALESCE(plan_value, 0) AS sort_value
           , created_at
      FROM plans
      WHERE deleted = FALSE
        AND is_active = TRUE
      )
      SELECT plan_id
      FROM candidates
      ORDER BY priority ASC, sort_value ASC, created_at ASC
      LIMIT 1
    `;
    const results = await executeQuery(query);
    return results[0]?.plan_id ?? null;
  }

  async getUserAndPlan(userId) {
    const effective = await this.getEffectivePlanByUserId(userId);
    if (!effective) return null;
    return {
      plan_details: effective.plan_details,
      plan_id: effective.plan_id,
      subscriber_id: effective.subscriber_id,
      subscriber_type: effective.subscriber_type,
      user_id: userId,
    };
  }

  async getPlanUsageCount(planId) {
    const query = `
    SELECT COUNT(*) AS user_count
    FROM users 
    WHERE plan_id = $1
      `;
    const results = await executeQuery(query, [planId]);
    return parseInt(results[0].user_count, 10);
  }

  async getUserWithPlan(userId) {
    return this.getUserAndPlan(userId);
  }

  /**
   * Resolve effective plan source (organization subscription preferred).
   * @param {string} userId
   * @returns {Promise<{
   *   plan_id: string|null,
   *   plan_name?: string|null,
   *   plan_version?: number|null,
   *   plan_details: object|null,
   *   subscriber_type: "organization"|"user",
   *   subscriber_id: string|null,
   *   subscription_id: string|null
   * }|null>}
   */
  async getEffectivePlanByUserId(userId) {
    const rows = await executeQuery(
      `
        WITH user_ctx AS (
          SELECT u.user_id, u.organization_id, u.plan_id AS legacy_plan_id
          FROM users u
          WHERE u.user_id = $1
          LIMIT 1
        ),
        org_sub AS (
          SELECT s.*
          FROM subscriptions s
          INNER JOIN user_ctx u ON u.organization_id = s.subscriber_id
          WHERE s.subscriber_type = 'organization'
            AND s.status IN ('active', 'past_due', 'trialing')
          ORDER BY s.updated_at DESC
          LIMIT 1
        ),
        user_sub AS (
          SELECT s.*
          FROM subscriptions s
          INNER JOIN user_ctx u ON u.user_id = s.subscriber_id
          WHERE s.subscriber_type = 'user'
            AND s.status IN ('active', 'past_due', 'trialing')
          ORDER BY s.updated_at DESC
          LIMIT 1
        ),
        effective AS (
          SELECT
            COALESCE(org_sub.plan_id, user_sub.plan_id, user_ctx.legacy_plan_id) AS plan_id,
            COALESCE(org_sub.id, user_sub.id, NULL) AS subscription_id,
            COALESCE(
              org_sub.subscriber_type,
              user_sub.subscriber_type,
              CASE WHEN user_ctx.organization_id IS NOT NULL THEN 'organization' ELSE 'user' END
            ) AS subscriber_type,
            COALESCE(org_sub.subscriber_id, user_sub.subscriber_id, user_ctx.user_id) AS subscriber_id
          FROM user_ctx
          LEFT JOIN org_sub ON TRUE
          LEFT JOIN user_sub ON TRUE
        )
        SELECT
          e.plan_id,
          e.subscription_id,
          e.subscriber_type,
          e.subscriber_id,
          p.details AS plan_details,
          p.name AS plan_name,
          p.plan_version
        FROM effective e
        LEFT JOIN plans p ON p.plan_id = e.plan_id
        LIMIT 1
      `,
      [userId]
    );

    const effective = rows[0];
    if (!effective) {
      return null;
    }

    const overrides = await this.getPlanLimitOverrides({
      planId: effective.plan_id,
      subscriberId: effective.subscriber_id,
      subscriberType: effective.subscriber_type,
    });

    return {
      ...effective,
      plan_details: this.mergePlanDetails(
        effective.plan_details || {},
        overrides || {}
      ),
    };
  }

  /**
   * @param {object} params
   * @param {string} params.planId
   * @param {string} params.subscriberId
   * @param {"organization"|"user"} params.subscriberType
   * @returns {Promise<Record<string, any>|null>}
   */
  async getPlanLimitOverrides({ planId, subscriberId, subscriberType }) {
    if (!planId || !subscriberId || !subscriberType) {
      return null;
    }

    const rows = await executeQuery(
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

  async getPlanUsage(userId, orgId = null) {
    const effective = orgId
      ? {
          subscriber_id: orgId,
          subscriber_type: "organization",
        }
      : await this.getEffectivePlanByUserId(userId);

    if (!effective?.subscriber_id || !effective?.subscriber_type) {
      return null;
    }

    const query = `
      SELECT id, plan_id, client_type, user_id, organization_id, usage_details,
             lifetime_stats, last_reset_at, created_at, updated_at,
             subscriber_type, subscriber_id, applied_plan_snapshot, applied_plan_version
      FROM plan_usages
      WHERE subscriber_type = $1
        AND subscriber_id = $2
      LIMIT 1
    `;
    const results = await executeQuery(query, [
      effective.subscriber_type,
      effective.subscriber_id,
    ]);
    return results[0];
  }

  /**
   * Resolve individual user usage (subscriber=user) without organization fallback.
   *
   * @param {string} userId
   * @returns {Promise<Record<string, any> | null>}
   */
  async getIndividualUserPlanUsage(userId) {
    const query = `
      SELECT
        pu.id,
        pu.plan_id,
        pu.client_type,
        pu.user_id,
        pu.organization_id,
        pu.usage_details,
        pu.lifetime_stats,
        pu.last_reset_at,
        pu.created_at,
        pu.updated_at,
        pu.subscriber_type,
        pu.subscriber_id,
        pu.applied_plan_snapshot,
        pu.applied_plan_version,
        p.name AS plan_name
      FROM plan_usages pu
      LEFT JOIN plans p ON p.plan_id = pu.plan_id
      WHERE pu.subscriber_type = 'user'
        AND pu.subscriber_id = $1
      LIMIT 1
    `;
    const results = await executeQuery(query, [userId]);
    return results[0] || null;
  }

  // ==========================================
  // WRITE AND INITIALIZATION
  // ==========================================

  async createInitialUsage(
    planId,
    userId,
    clientType,
    initialUsageJson,
    orgId = null,
    subscriberType = "user",
    subscriberId = userId,
    appliedPlanSnapshot = {},
    appliedPlanVersion = 1
  ) {
    const query = `
      INSERT INTO plan_usages (
        plan_id,
        user_id,
        organization_id,
        client_type,
        usage_details,
        last_reset_at,
        subscriber_type,
        subscriber_id,
        applied_plan_snapshot,
        applied_plan_version
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9)
      RETURNING *`;
    const results = await executeQuery(query, [
      planId,
      userId,
      orgId,
      clientType,
      initialUsageJson,
      subscriberType,
      subscriberId,
      appliedPlanSnapshot,
      appliedPlanVersion,
    ]);
    return results[0];
  }

  /**
   * Register usage event for idempotency.
   * @param {object} params
   * @param {string} params.eventId
   * @param {string} params.operation
   * @param {object} params.payload
   * @param {string} params.planUsageId
   * @returns {Promise<boolean>}
   */
  async registerUsageEvent({ eventId, operation, payload, planUsageId }) {
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
      [eventId, operation, JSON.stringify(payload || {}), planUsageId]
    );
    return Boolean(rows[0]);
  }

  // ==========================================
  // Monthly Snapshot and Usage Reset
  // ==========================================

  /**
   * Smart Increment: Updates JSONB and, if note or AI, updates the Audit column (Lifetime)
   */
  async incrementUsageCounter(usageId, jsonPath, amount = 1) {
    // Detects if the path is note or AI to update the corresponding audit column
    const isNote = jsonPath.includes("notes_total");
    const isAI = jsonPath.includes("messages_sent");
    const isStorage = jsonPath.includes("storage");

    // Use numeric for storage (decimal values in MB), int for the rest
    const castType = isStorage ? "numeric" : "int";

    const query = `
      UPDATE plan_usages 
      SET 
        usage_details = jsonb_set(
          usage_details, 
          $1, 
          ((COALESCE(usage_details #>> $1, '0')::${castType}) + $2)::text::jsonb
        ),
        ${isNote ? "lifetime_stats = jsonb_set(lifetime_stats, '{total_notes_ever}', ((COALESCE(lifetime_stats->>'total_notes_ever', '0')::int) + $2)::text::jsonb)," : ""}
        ${isAI ? "lifetime_stats = jsonb_set(lifetime_stats, '{total_ai_messages_ever}', ((COALESCE(lifetime_stats->>'total_ai_messages_ever', '0')::int) + $2)::text::jsonb)," : ""}
        updated_at = NOW()
      WHERE id = $3
      RETURNING *`;

    const results = await executeQuery(query, [jsonPath, amount, usageId]);
    return results[0];
  }

  async updateJsonValue(usageId, jsonPath, value) {
    const query = `
      UPDATE plan_usages 
      SET usage_details = jsonb_set(usage_details, $1, $2::jsonb),
          updated_at = NOW()
      WHERE id = $3
      RETURNING usage_details`;
    const results = await executeQuery(query, [
      jsonPath,
      JSON.stringify(value),
      usageId,
    ]);
    return results[0];
  }

  // ==========================================
  // CYCLE AND HISTORY MANAGEMENT
  // ==========================================

  async updateFullUsage(usageId, usageDetails, lastResetAt = null) {
    const query = `
      UPDATE plan_usages 
      SET usage_details = $1, 
          last_reset_at = COALESCE($2, last_reset_at),
          updated_at = NOW() 
      WHERE id = $3 
      RETURNING *`;
    const results = await executeQuery(query, [
      usageDetails,
      lastResetAt,
      usageId,
    ]);
    return results[0];
  }

  /**
   * Saves the month's snapshot in the history table
   */
  async saveUsageHistory(historyData) {
    const {
      plan_usage_id,
      user_id,
      organization_id,
      plan_id,
      period_start,
      period_end,
      final_usage_details,
      total_notes_created,
      total_projects_created,
      total_ai_messages,
      total_storage_mb,
      total_exports,
    } = historyData;

    const query = `
      INSERT INTO plan_usage_history 
        (plan_usage_id, user_id, organization_id, plan_id, period_start, period_end, 
         final_usage_details, total_notes_created, total_projects_created,
         total_ai_messages, total_storage_mb, total_exports)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`;

    const results = await executeQuery(query, [
      plan_usage_id,
      user_id,
      organization_id,
      plan_id,
      period_start,
      period_end,
      final_usage_details,
      total_notes_created || 0,
      total_projects_created || 0,
      total_ai_messages || 0,
      total_storage_mb || 0,
      total_exports || 0,
    ]);

    return results[0];
  }

  /**
   * Updates lifetime stats
   */
  async updateLifetimeStats(usageId, increments) {
    const query = `
      UPDATE plan_usages
      SET 
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
        updated_at = NOW()
      WHERE id = $1
      RETURNING lifetime_stats`;

    const results = await executeQuery(query, [
      usageId,
      increments.notes || 0,
      increments.projects || 0,
      increments.ai_messages || 0,
      increments.storage_mb || 0,
    ]);

    return results[0];
  }

  /**
   * Fetches usage history
   */
  async getUsageHistory(userId, limit = 12) {
    const query = `
      WITH latest_org AS (
        SELECT om.organization_id
        FROM organization_members om
        WHERE om.user_id = $1
          AND om.deleted = false
        ORDER BY om.created_at DESC
        LIMIT 1
      )
      SELECT 
        id, period_start, period_end,
        total_notes_created, total_projects_created,
        total_ai_messages, total_storage_mb, total_exports,
        created_at
      FROM plan_usage_history
      WHERE user_id = $1
         OR (
           organization_id = (SELECT organization_id FROM latest_org)
           AND (SELECT organization_id FROM latest_org) IS NOT NULL
         )
      ORDER BY
        CASE
          WHEN organization_id = (SELECT organization_id FROM latest_org) THEN 1
          ELSE 2
        END,
        period_end DESC
      LIMIT $2`;

    return await executeQuery(query, [userId, limit]);
  }

  /**
   * Fetches detailed monthly usage history for individual users.
   *
   * @param {object} params
   * @param {string} params.userId
   * @param {number} params.limit
   * @param {number} params.offset
   * @param {string | null} params.from
   * @param {string | null} params.to
   * @returns {Promise<Array<Record<string, any>>>}
   */
  async getIndividualUsageHistoryDetailed({
    userId,
    limit = 6,
    offset = 0,
    from = null,
    to = null,
  }) {
    const query = `
      SELECT
        h.id,
        h.user_id,
        h.organization_id,
        h.plan_id,
        p.name AS plan_name,
        h.period_start,
        h.period_end,
        h.final_usage_details,
        h.total_notes_created,
        h.total_projects_created,
        h.total_ai_messages,
        h.total_storage_mb,
        h.total_exports,
        h.created_at
      FROM plan_usage_history h
      LEFT JOIN plans p ON p.plan_id = h.plan_id
      WHERE h.user_id = $1
        AND h.organization_id IS NULL
        AND ($2::timestamptz IS NULL OR h.period_start >= $2::timestamptz)
        AND ($3::timestamptz IS NULL OR h.period_end <= $3::timestamptz)
      ORDER BY h.period_end DESC
      OFFSET $4
      LIMIT $5
    `;

    return await executeQuery(query, [userId, from, to, offset, limit]);
  }

  async assignPlanToUser(userId, planId) {
    const rows = await executeQuery(
      `
        UPDATE users
        SET plan_id = $2, updated_at = NOW()
        WHERE user_id = $1
        RETURNING user_id, plan_id
      `,
      [userId, planId]
    );

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await executeQuery(
      `
        INSERT INTO subscriptions (
          subscriber_type,
          subscriber_id,
          plan_id,
          status,
          provider,
          current_period_start,
          current_period_end
        )
        VALUES ('user', $1, $2, 'active', 'internal', $3, $4)
        ON CONFLICT (subscriber_type, subscriber_id)
        DO UPDATE SET
          plan_id = EXCLUDED.plan_id,
          status = EXCLUDED.status,
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = EXCLUDED.current_period_end,
          updated_at = NOW()
      `,
      [userId, planId, now, periodEnd]
    );

    return rows[0];
  }
}

module.exports = new PlansRepository();
