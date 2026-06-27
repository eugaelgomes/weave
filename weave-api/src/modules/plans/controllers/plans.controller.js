const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { executeQuery } = require("@/database/connection");
const { USAGE_PATHS } = require("@/services/plans/plan-paths");
const { enqueuePlanUsageJob } = require("@/services/queue/queue-controller");

class PlanUsageManager {
  /**
   * Manages the usage cycle: fetches the record and creates if it doesn't exist.
   * Monthly rollover is now executed by the worker.
   */
  /**
   *
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

  /**
   * Increments the total of created notes
   */
  async consumeNoteCreation(usageId) {
    return enqueuePlanUsageJob({
      operation: "consume_note_creation",
      usageId,
    });
  }

  /**
   * @param {string} usageId
   * @param {number} [amount=1] - Number of notes deleted (supports bulk)
   */
  async decrementNoteUsage(usageId, amount = 1) {
    return enqueuePlanUsageJob({
      operation: "consume_note_creation",
      payload: { amount: -Math.abs(amount) },
      usageId,
    });
  }

  /**
   * Increments the total of created projects
   */
  async consumeProjectCreation(usageId) {
    return enqueuePlanUsageJob({
      operation: "consume_project_creation",
      usageId,
    });
  }

  /**
   * @param {string} usageId
   * @param {number} [amount=1] - Number of projects deleted (supports bulk)
   */
  async decrementProjectUsage(usageId, amount = 1) {
    return enqueuePlanUsageJob({
      operation: "consume_project_creation",
      payload: { amount: -Math.abs(amount) },
      usageId,
    });
  }

  /**
   * Increments AI usage (messages and optionally tokens)
   */
  async consumeAiMessage(usageId, tokens = 0) {
    return enqueuePlanUsageJob({
      operation: "consume_ai_message",
      payload: { tokens },
      usageId,
    });
  }

  /**
   * Increments storage usage (files and MB)
   */
  async consumeStorage(usageId, fileSizeMb) {
    return enqueuePlanUsageJob({
      operation: "consume_storage",
      payload: { fileSizeMb },
      usageId,
    });
  }

  /**
   * Increments export counters
   */
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

  /**
   * Fetches user usage history
   */
  async getUserUsageHistory(userId, limit = 12) {
    return await PlansRepository.getUsageHistory(userId, limit);
  }

  /**
   * Generates usage report
   */
  async generateUsageReport(userId) {
    const history = await this.getUserUsageHistory(userId);
    const currentUsage = await PlansRepository.getPlanUsage(userId);

    return {
      current_period: currentUsage?.usage_details,
      lifetime_stats: currentUsage?.lifetime_stats,
      history: history.map((h) => ({
        period: `${h.period_start} - ${h.period_end}`,
        notes: h.total_notes_created,
        projects: h.total_projects_created,
        ai_messages: h.total_ai_messages,
        storage_mb: h.total_storage_mb,
        exports: h.total_exports,
      })),
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
      usage_summary: {
        notes_total: 0,
        projects_total: 0,
        team_members_total: 1,
      },
      monthly_cycle: {
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        exports: { notes_count: 0, backups_count: 0 },
        storage: { total_uploaded_mb: 0, files_count: 0 },
        weave_ai: { messages_sent: 0, tokens_estimated: 0 },
      },
      history_metadata: {
        last_activity_at: startDate.toISOString(),
        usage_percentage_total: 0,
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
}

module.exports = new PlanUsageManager();
