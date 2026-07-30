const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { executeQuery } = require("@/database/connection");
const { enqueuePlanUsageJob } = require("@/services/queue/queue-controller");
const { USAGE_PATHS } = require("@/modules/plans/utils/plan-paths.util");

class PlansService {
  // ==========================================
  // CORE PLAN METHODS (For Tools & API)
  // ==========================================

  async getCurrentPlan(userId) {
    return await PlansRepository.getUserWithPlan(userId);
  }

  async listAvailablePlans() {
    const plans = await PlansRepository.getAllPlans();
    if (!plans) return [];
    if (plans instanceof Error) throw plans;

    return plans.map((plan) => ({
      createdAt: plan.created_at,
      details: this._sanitizePlanForPublic(plan.details),
      name: plan.name,
      planId: plan.plan_id,
      updatedAt: plan.updated_at,
    }));
  }

  _sanitizePlanForPublic(details) {
    if (!details || typeof details !== "object") return {};
    // eslint-disable-next-line no-unused-vars
    const { billing, governance, weave_ai, ...publicFields } = details;
    return publicFields;
  }

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  async changePlan(userId, planId) {
    const targetPlan = await PlansRepository.getPlanById(planId);
    if (!targetPlan) {
      const error = new Error("Target plan not found");
      error.statusCode = 404;
      throw error;
    }

    const effective = await PlansRepository.getEffectivePlanByUserId(userId);
    if (!effective) {
      const error = new Error("No active subscription found");
      error.statusCode = 404;
      throw error;
    }

    if (effective.plan_id === planId) {
      const error = new Error("Already on this plan");
      error.statusCode = 409;
      throw error;
    }

    const subscriberType = effective.subscriber_type;
    const subscriberId = effective.subscriber_id;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await executeQuery(
      `INSERT INTO subscriptions (subscriber_type, subscriber_id, plan_id, status, provider, current_period_start, current_period_end, cancel_at_period_end)
       VALUES ($1, $2, $3, 'active', 'internal', $4, $5, false)
       ON CONFLICT (subscriber_type, subscriber_id)
       DO UPDATE SET
         plan_id = EXCLUDED.plan_id,
         status = 'active',
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = false,
         updated_at = NOW()`,
      [subscriberType, subscriberId, planId, now, periodEnd]
    );

    if (subscriberType === "user") {
      await executeQuery(
        `UPDATE users SET plan_id = $1, updated_at = NOW() WHERE user_id = $2`,
        [planId, subscriberId]
      );
    } else {
      await executeQuery(
        `UPDATE organizations SET plan_id = $1, updated_at = NOW() WHERE id = $2`,
        [planId, subscriberId]
      );
    }

    await this._refreshPlanUsageSnapshot(
      subscriberType,
      subscriberId,
      targetPlan
    );

    const usageRecord = await PlansRepository.getPlanUsage(userId);
    const downgradWarnings = this._checkDowngradeWarnings(
      usageRecord?.usage_details,
      targetPlan.details
    );

    return {
      plan: { id: targetPlan.plan_id, name: targetPlan.name },
      warnings: downgradWarnings,
    };
  }

  async cancelSubscription(userId) {
    const effective = await PlansRepository.getEffectivePlanByUserId(userId);
    if (!effective) {
      const error = new Error("No active subscription found");
      error.statusCode = 404;
      throw error;
    }

    const subscription = await this.getSubscriptionRow(
      effective.subscriber_type,
      effective.subscriber_id
    );

    if (!subscription) {
      const error = new Error("Subscription record not found");
      error.statusCode = 404;
      throw error;
    }

    if (subscription.cancel_at_period_end) {
      const error = new Error("Cancellation already scheduled");
      error.statusCode = 409;
      throw error;
    }

    await executeQuery(
      `UPDATE subscriptions
       SET cancel_at_period_end = true, updated_at = NOW()
       WHERE subscriber_type = $1 AND subscriber_id = $2
         AND status IN ('active', 'past_due', 'trialing')`,
      [effective.subscriber_type, effective.subscriber_id]
    );

    return {
      current_period_end: subscription.current_period_end,
    };
  }

  async getSubscriptionRow(subscriberType, subscriberId) {
    const rows = await executeQuery(
      `SELECT * FROM subscriptions
       WHERE subscriber_type = $1 AND subscriber_id = $2
       ORDER BY updated_at DESC LIMIT 1`,
      [subscriberType, subscriberId]
    );
    return rows[0] || null;
  }

  async _refreshPlanUsageSnapshot(subscriberType, subscriberId, targetPlan) {
    await executeQuery(
      `UPDATE plan_usages
       SET plan_id = $1,
           applied_plan_snapshot = $2,
           applied_plan_version = $3,
           updated_at = NOW()
       WHERE subscriber_type = $4 AND subscriber_id = $5`,
      [
        targetPlan.plan_id,
        targetPlan.details,
        targetPlan.plan_version || 1,
        subscriberType,
        subscriberId,
      ]
    );
  }

  _checkDowngradeWarnings(usageDetails, newPlanDetails) {
    if (!usageDetails || !newPlanDetails) return [];
    const warnings = [];

    const checks = [
      {
        label: "notes",
        limit: "limits.max_notes",
        usage: "usage_summary.notes_total",
      },
      {
        label: "projects",
        limit: "limits.max_projects",
        usage: "usage_summary.projects_total",
      },
      {
        label: "team members",
        limit: "limits.max_team_members",
        usage: "usage_summary.team_members_total",
      },
    ];

    for (const check of checks) {
      const current = this.getNestedValue(usageDetails, check.usage) || 0;
      const limit = this.getNestedValue(newPlanDetails, check.limit);
      if (limit !== null && limit !== undefined && current > limit) {
        warnings.push(
          `Current ${check.label} (${current}) exceeds new plan limit (${limit}).`
        );
      }
    }

    return warnings;
  }

  // ==========================================
  // USAGE & LIMITS MANAGEMENT
  // ==========================================

  /**
   * Manages the usage cycle: fetches the record and creates if it doesn't exist.
   * @param {string} userId
   * @param {string | null} orgId
   * @returns {Promise<Record<string, any>>}
   */
  async managePlanUsage(userId, orgId = null) {
    let usageRecord = await PlansRepository.getPlanUsage(userId, orgId);

    // 1. "Lazy" initialization (Creates on first use)
    if (!usageRecord) {
      usageRecord = await this._initializeFirstUsage(userId, orgId);
    }

    if (!usageRecord) {
      throw new Error(
        "Could not initialize usage: User without assigned plan."
      );
    }

    return usageRecord;
  }

  /**
   * Compares current usage with the limit (Synchronous)
   */
  checkLimit(planDetails, planUsage, actionPath, limitPath) {
    const currentUsage = this.getNestedValue(planUsage, actionPath) || 0;
    const limit = this.getNestedValue(planDetails, limitPath);

    if (limit === null || limit === undefined) return true; // Unlimited

    return currentUsage < limit;
  }

  /**
   * Validates and fetches usage in a single step (Asynchronous)
   */
  async canPerformAction(
    userId,
    planDetails,
    actionPath,
    limitPath,
    orgId = null
  ) {
    const usageRecord = await this.managePlanUsage(userId, orgId);
    if (!usageRecord) return false;

    return this.checkLimit(
      planDetails,
      usageRecord.usage_details,
      actionPath,
      limitPath
    );
  }

  // ==========================================
  // CONSUMPTION METHODS (INCREMENTS)
  // ==========================================

  async consumeNoteCreation(usageId) {
    return enqueuePlanUsageJob({
      operation: "consume_note_creation",
      usageId,
    });
  }

  async decrementNoteUsage(usageId, amount = 1) {
    return enqueuePlanUsageJob({
      operation: "consume_note_creation",
      payload: { amount: -Math.abs(amount) },
      usageId,
    });
  }

  async consumeProjectCreation(usageId) {
    return enqueuePlanUsageJob({
      operation: "consume_project_creation",
      usageId,
    });
  }

  async decrementProjectUsage(usageId, amount = 1) {
    return enqueuePlanUsageJob({
      operation: "consume_project_creation",
      payload: { amount: -Math.abs(amount) },
      usageId,
    });
  }

  async consumeAiMessage(
    usageId,
    { tokens = 0, reasoningLevel = "none", filesCount = 0 } = {}
  ) {
    return enqueuePlanUsageJob({
      operation: "consume_ai_message",
      payload: { filesCount, reasoningLevel, tokens },
      usageId,
    });
  }

  async consumeStorage(usageId, fileSizeMb) {
    return enqueuePlanUsageJob({
      operation: "consume_storage",
      payload: { fileSizeMb },
      usageId,
    });
  }

  async consumeExport(usageId, type = "notes") {
    return enqueuePlanUsageJob({
      operation: "consume_export",
      payload: { type },
      usageId,
    });
  }

  // ==========================================
  // INTERNAL LOGIC AND HELPERS
  // ==========================================

  async getUserUsageHistory(userId, limit = 12) {
    return await PlansRepository.getUsageHistory(userId, limit);
  }

  async generateUsageReport(userId) {
    const history = await this.getUserUsageHistory(userId);
    const currentUsage = await PlansRepository.getPlanUsage(userId);

    return {
      current_period: currentUsage?.usage_details,
      history: history.map((h) => ({
        ai_messages: h.total_ai_messages,
        exports: h.total_exports,
        notes: h.total_notes_created,
        period: `${h.period_start} - ${h.period_end}`,
        projects: h.total_projects_created,
        storage_mb: h.total_storage_mb,
      })),
      lifetime_stats: currentUsage?.lifetime_stats,
    };
  }

  async _initializeFirstUsage(userId, orgId) {
    const effectivePlan =
      await PlansRepository.getEffectivePlanByUserId(userId);
    const user = await PlansRepository.getUserWithPlan(userId);
    if (!user && !effectivePlan) return null;

    let planId = effectivePlan?.plan_id;
    let appliedPlanSnapshot = effectivePlan?.plan_details || null;
    let appliedPlanVersion = effectivePlan?.plan_version || null;

    if (!planId) {
      const defaultPlanId = await PlansRepository.getDefaultSignupPlanId();
      if (defaultPlanId) {
        const defaultPlan = await PlansRepository.getPlanById(defaultPlanId);
        planId = defaultPlan?.plan_id || null;
        appliedPlanSnapshot = defaultPlan?.details || null;
        appliedPlanVersion = defaultPlan?.plan_version || 1;
      }
    }
    if (!planId || !appliedPlanSnapshot) return null;

    if (user && !user.plan_id) {
      await executeQuery(
        `UPDATE users SET plan_id = $1 WHERE user_id = $2 AND plan_id IS NULL`,
        [planId, userId]
      );
    }

    const subscriberType = orgId
      ? "organization"
      : effectivePlan?.subscriber_type || "user";
    const subscriberId = orgId || effectivePlan?.subscriber_id || userId;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const initialUsageDetails = {
      history_metadata: {
        last_activity_at: startDate.toISOString(),
        usage_percentage_total: 0,
      },
      monthly_cycle: {
        current_period_end: endDate.toISOString(),
        current_period_start: startDate.toISOString(),
        exports: { backups_count: 0, notes_count: 0 },
        storage: { files_count: 0, total_uploaded_mb: 0 },
        weave_ai: {
          files_analyzed: 0,
          messages_sent: 0,
          reasoning_high_sent: 0,
          reasoning_low_sent: 0,
          reasoning_medium_sent: 0,
          tokens_estimated: 0,
        },
      },
      usage_summary: {
        notes_total: 0,
        projects_total: 0,
        team_members_total: 1,
      },
    };

    return await PlansRepository.createInitialUsage(
      planId,
      userId,
      orgId ? "organization" : "user",
      initialUsageDetails,
      orgId,
      subscriberType,
      subscriberId,
      appliedPlanSnapshot,
      appliedPlanVersion || 1
    );
  }

  getNestedValue(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }

  toPgPath(dotPath) {
    return `{${dotPath.replace(/\./g, ",")}}`;
  }

  async updateLastActivity(usageId) {
    return await PlansRepository.updateJsonValue(
      usageId,
      this.toPgPath(USAGE_PATHS.HISTORY.LAST_ACTIVITY),
      new Date().toISOString()
    );
  }

  async setDefaultPlanForNewUser(userId) {
    const user = await PlansRepository.getUserAndPlan(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    if (user.plan_id) {
      return user;
    }

    const defaultPlanId = await PlansRepository.getDefaultSignupPlanId();
    if (!defaultPlanId) {
      throw new Error("Default signup plan not found.");
    }

    return await PlansRepository.assignPlanToUser(userId, defaultPlanId);
  }
}

module.exports = new PlansService();
