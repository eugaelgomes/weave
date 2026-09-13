const { prisma } = require("@theweave/database");

/**
 * @typedef {import('@prisma/client').PrismaClient} PrismaClient
 */

class PlansRepository {
  /**
   * Deep merges base plan details with override details.
   *
   * @param {Record<string, any>} base - The base plan details.
   * @param {Record<string, any>} override - The override details.
   * @returns {Record<string, any>} The merged details object.
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
  // READ OPERATIONS
  // ==========================================

  /**
   * Retrieves all active (non-deleted) plans.
   *
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Array<Record<string, any>>>} A list of active plans.
   */
  async getAllPlans(client = prisma) {
    return client.plans.findMany({
      orderBy: { name: "asc" },
      select: {
        created_at: true,
        details: true,
        name: true,
        plan_id: true,
      },
      where: { deleted: false },
    });
  }

  /**
   * Retrieves a plan by its unique identifier.
   *
   * @param {string} planId - The unique ID of the plan.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any> | null>} The plan object or null if not found.
   */
  async getPlanById(planId, client = prisma) {
    return client.plans.findUnique({
      select: {
        created_at: true,
        details: true,
        name: true,
        plan_id: true,
        plan_version: true,
      },
      where: { plan_id: planId },
    });
  }

  /**
   * Retrieves a plan by its name (case-insensitive).
   *
   * @param {string} name - The name of the plan.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any> | null>} The plan object or null if not found.
   */
  async getPlanByName(name, client = prisma) {
    return client.plans.findFirst({
      select: {
        created_at: true,
        details: true,
        name: true,
        plan_id: true,
        plan_version: true,
      },
      where: {
        deleted: false,
        name: { equals: name, mode: "insensitive" },
      },
    });
  }

  /**
   * Retrieves the default plan ID for new signups.
   * Prioritizes plans explicitly marked as default in details.metadata.is_signup_default.
   * Falls back to the cheapest active plan when no default flag is present.
   *
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<string | null>} The ID of the default signup plan, or null if none exist.
   */
  async getDefaultSignupPlanId(client = prisma) {
    const plans = await client.plans.findMany({
      orderBy: [{ plan_value: "asc" }, { created_at: "asc" }],
      select: {
        created_at: true,
        details: true,
        plan_id: true,
        plan_value: true,
      },
      where: {
        deleted: false,
        is_active: true,
      },
    });

    if (plans.length === 0) return null;

    // Check for explicit default
    const defaultPlan = plans.find((p) => p.details?.metadata?.is_signup_default === true);
    if (defaultPlan) {
      return defaultPlan.plan_id;
    }

    // Fallback to the cheapest (which is already first in the sorted array)
    return plans[0].plan_id;
  }

  /**
   * Retrieves the effective plan and subscriber details for a specific user.
   *
   * @param {string} userId - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any> | null>} The user's effective plan information.
   */
  async getUserAndPlan(userId, client = prisma) {
    const effective = await this.getEffectivePlanByUserId(userId, client);
    if (!effective) return null;
    return {
      plan_details: effective.plan_details,
      plan_id: effective.plan_id,
      subscriber_id: effective.subscriber_id,
      subscriber_type: effective.subscriber_type,
      user_id: userId,
    };
  }

  /**
   * Counts the number of users directly assigned to a specific plan.
   *
   * @param {string} planId - The plan ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<number>} The total number of users assigned to the plan.
   */
  async getPlanUsageCount(planId, client = prisma) {
    return client.users.count({
      where: { plan_id: planId },
    });
  }

  /**
   * Alias for getUserAndPlan.
   *
   * @param {string} userId - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any> | null>} The user's effective plan information.
   */
  async getUserWithPlan(userId, client = prisma) {
    return this.getUserAndPlan(userId, client);
  }

  /**
   * Resolves the effective plan source for a given user, preferring workspace
   * subscriptions over user subscriptions or direct user plan assignment.
   *
   * @param {string} userId - The user ID to resolve effective plan for.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<{
   *   plan_id: string|null,
   *   plan_name?: string|null,
   *   plan_version?: number|null,
   *   plan_details: object|null,
   *   subscriber_type: "workspace"|"user",
   *   subscriber_id: string|null,
   *   subscription_id: string|null
   * }|null>}
   */
  async getEffectivePlanByUserId(userId, client = prisma) {
    // Get user's base information
    const user = await client.users.findUnique({
      select: { plan_id: true, user_id: true, workspace_id: true },
      where: { user_id: userId },
    });

    if (!user) return null;

    let orgSub = null;
    if (user.workspace_id) {
      orgSub = await client.subscriptions.findFirst({
        orderBy: { updated_at: "desc" },
        where: {
          status: { in: ["active", "past_due", "trialing"] },
          subscriber_id: user.workspace_id,
          subscriber_type: "workspace",
        },
      });
    }

    const userSub = await client.subscriptions.findFirst({
      orderBy: { updated_at: "desc" },
      where: {
        status: { in: ["active", "past_due", "trialing"] },
        subscriber_id: user.user_id,
        subscriber_type: "user",
      },
    });

    const effective = {
      plan_id: orgSub?.plan_id || userSub?.plan_id || user.plan_id,
      subscriber_id:
        orgSub?.subscriber_id ||
        userSub?.subscriber_id ||
        (user.workspace_id ? user.workspace_id : user.user_id),
      subscriber_type: orgSub
        ? "workspace"
        : userSub
          ? "user"
          : user.workspace_id
            ? "workspace"
            : "user",
      subscription_id: orgSub?.id || userSub?.id || null,
    };

    if (!effective.plan_id) return null;

    const plan = await client.plans.findUnique({
      select: { details: true, name: true, plan_version: true },
      where: { plan_id: effective.plan_id },
    });

    if (!plan) return null;

    const overrides = await this.getPlanLimitOverrides(
      {
        planId: effective.plan_id,
        subscriberId: effective.subscriber_id,
        subscriberType: effective.subscriber_type,
      },
      client
    );

    return {
      ...effective,
      plan_details: this.mergePlanDetails(plan.details || {}, overrides || {}),
      plan_name: plan.name,
      plan_version: plan.plan_version,
    };
  }

  /**
   * Retrieves active plan limit overrides for a given subscriber and plan.
   *
   * @param {object} params - Parameters object.
   * @param {string} params.planId - The plan ID.
   * @param {string} params.subscriberId - The subscriber ID.
   * @param {"workspace"|"user"} params.subscriberType - The subscriber type.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any>|null>} The override details, or null if none are active.
   */
  async getPlanLimitOverrides({ planId, subscriberId, subscriberType }, client = prisma) {
    if (!planId || !subscriberId || !subscriberType) {
      return null;
    }

    const now = new Date();

    const override = await client.plan_limit_overrides.findFirst({
      orderBy: { created_at: "desc" },
      select: { override_details: true },
      where: {
        AND: [
          {
            OR: [{ ends_at: null }, { ends_at: { gte: now } }],
          },
        ],
        is_active: true,
        OR: [{ starts_at: null }, { starts_at: { lte: now } }],
        plan_id: planId,
        subscriber_id: subscriberId,
        subscriber_type: subscriberType,
      },
    });

    return override?.override_details || null;
  }

  /**
   * Retrieves current plan usage records for a given user or workspace.
   *
   * @param {string} userId - The user ID.
   * @param {string|null} [workspaceId=null] - The workspace ID (optional, forces workspace resolution).
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any> | null>} The plan usage entity.
   */
  async getPlanUsage(userId, workspaceId = null, client = prisma) {
    const effective = workspaceId
      ? {
          subscriber_id: workspaceId,
          subscriber_type: "workspace",
        }
      : await this.getEffectivePlanByUserId(userId, client);

    if (!effective?.subscriber_id || !effective?.subscriber_type) {
      return null;
    }

    return client.plan_usages.findFirst({
      select: {
        applied_plan_snapshot: true,
        applied_plan_version: true,
        client_type: true,
        created_at: true,
        id: true,
        last_reset_at: true,
        lifetime_stats: true,
        plan_id: true,
        subscriber_id: true,
        subscriber_type: true,
        updated_at: true,
        usage_details: true,
        user_id: true,
        workspace_id: true,
      },
      where: {
        subscriber_id: effective.subscriber_id,
        subscriber_type: effective.subscriber_type,
      },
    });
  }

  /**
   * Resolves individual user usage (subscriber=user) without workspace fallback.
   *
   * @param {string} userId - The user ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any> | null>} The user's individual usage record.
   */
  async getIndividualUserPlanUsage(userId, client = prisma) {
    const usage = await client.plan_usages.findFirst({
      include: {
        plans: {
          select: { name: true },
        },
      },
      where: {
        subscriber_id: userId,
        subscriber_type: "user",
      },
    });

    if (!usage) return null;

    const { plans, ...rest } = usage;
    return {
      ...rest,
      plan_name: plans?.name || null,
    };
  }

  // ==========================================
  // WRITE AND INITIALIZATION
  // ==========================================

  /**
   * Initializes a new plan usage record for a subscriber.
   *
   * @param {string} planId - The plan ID.
   * @param {string} userId - The user ID responsible.
   * @param {string} clientType - The application client type (e.g. web, mobile).
   * @param {object} initialUsageJson - The starting usage metrics.
   * @param {string|null} [workspaceId=null] - The workspace ID (optional).
   * @param {"workspace"|"user"} [subscriberType="user"] - The subscriber type.
   * @param {string} [subscriberId=userId] - The specific subscriber ID.
   * @param {object} [appliedPlanSnapshot={}] - A point-in-time snapshot of the applied plan details.
   * @param {number} [appliedPlanVersion=1] - The version of the plan applied.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any>>} The created plan usage record.
   */
  async createInitialUsage(
    planId,
    userId,
    clientType,
    initialUsageJson,
    workspaceId = null,
    subscriberType = "user",
    subscriberId = userId,
    appliedPlanSnapshot = {},
    appliedPlanVersion = 1,
    client = prisma
  ) {
    return client.plan_usages.create({
      data: {
        applied_plan_snapshot: appliedPlanSnapshot,
        applied_plan_version: appliedPlanVersion,
        client_type: clientType,
        last_reset_at: new Date(),
        plan_id: planId,
        subscriber_id: subscriberId,
        subscriber_type: subscriberType,
        usage_details: initialUsageJson,
        user_id: userId,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * Registers a usage event for idempotency and tracking.
   *
   * @param {object} params - The event details.
   * @param {string} params.eventId - Unique identifier for the event.
   * @param {string} params.operation - The type of operation (e.g. 'increment_ai_message').
   * @param {object} params.payload - Custom payload data related to the event.
   * @param {string} params.planUsageId - The linked plan usage record ID.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<boolean>} True if registered successfully, False if duplicate.
   */
  async registerUsageEvent({ eventId, operation, payload, planUsageId }, client = prisma) {
    try {
      await client.usage_events.create({
        data: {
          event_id: eventId,
          operation,
          payload: payload || {},
          plan_usage_id: planUsageId,
          processed_at: new Date(),
        },
      });
      return true;
    } catch (error) {
      if (error.code === "P2002") {
        return false; // Event already exists (Unique constraint violation)
      }
      throw error;
    }
  }

  // ==========================================
  // MONTHLY SNAPSHOT AND USAGE UPDATES
  // ==========================================

  /**
   * Atomically increments a usage counter inside the usage_details JSONB field.
   * Also updates relevant lifetime_stats if tracking specific metrics (e.g., notes, AI, storage).
   *
   * @param {string} usageId - The plan_usages ID.
   * @param {string[]} jsonPath - The path in the JSONB object (e.g., ['ai', 'messages_sent']).
   * @param {number} [amount=1] - The increment amount.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any>>} The updated plan usage record.
   */
  async incrementUsageCounter(usageId, jsonPath, amount = 1, client = prisma) {
    const isNote = jsonPath.includes("notes_total");
    const isAI = jsonPath.includes("messages_sent");

    return client.$transaction(async (tx) => {
      const usage = await tx.plan_usages.findUnique({
        select: { lifetime_stats: true, usage_details: true },
        where: { id: usageId },
      });

      if (!usage) return null;

      const usageDetails = usage.usage_details || {};
      const lifetimeStats = usage.lifetime_stats || {};

      let current = usageDetails;
      for (let i = 0; i < jsonPath.length - 1; i++) {
        if (!current[jsonPath[i]]) {
          current[jsonPath[i]] = {};
        }
        current = current[jsonPath[i]];
      }

      const lastKey = jsonPath[jsonPath.length - 1];
      current[lastKey] = (Number(current[lastKey]) || 0) + amount;

      if (isNote) {
        lifetimeStats.total_notes_ever = (Number(lifetimeStats.total_notes_ever) || 0) + amount;
      }
      if (isAI) {
        lifetimeStats.total_ai_messages_ever =
          (Number(lifetimeStats.total_ai_messages_ever) || 0) + amount;
      }

      return tx.plan_usages.update({
        data: {
          lifetime_stats: lifetimeStats,
          updated_at: new Date(),
          usage_details: usageDetails,
        },
        where: { id: usageId },
      });
    });
  }

  /**
   * Atomically updates a specific JSONB path inside usage_details to a new value.
   *
   * @param {string} usageId - The plan_usages ID.
   * @param {string[]} jsonPath - The path in the JSONB object.
   * @param {any} value - The new value to set.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<object>} The updated usage_details payload.
   */
  async updateJsonValue(usageId, jsonPath, value, client = prisma) {
    return client.$transaction(async (tx) => {
      const usage = await tx.plan_usages.findUnique({
        select: { usage_details: true },
        where: { id: usageId },
      });

      if (!usage) return null;

      const usageDetails = usage.usage_details || {};

      let current = usageDetails;
      for (let i = 0; i < jsonPath.length - 1; i++) {
        if (!current[jsonPath[i]]) {
          current[jsonPath[i]] = {};
        }
        current = current[jsonPath[i]];
      }

      const lastKey = jsonPath[jsonPath.length - 1];
      current[lastKey] = value;

      const updated = await tx.plan_usages.update({
        data: {
          updated_at: new Date(),
          usage_details: usageDetails,
        },
        where: { id: usageId },
      });

      return updated.usage_details;
    });
  }

  // ==========================================
  // CYCLE AND HISTORY MANAGEMENT
  // ==========================================

  /**
   * Replaces the entire usage_details object, typically used during cycle reset.
   *
   * @param {string} usageId - The plan_usages ID.
   * @param {object} usageDetails - The new comprehensive usage details payload.
   * @param {Date|null} [lastResetAt=null] - Optional new cycle reset timestamp.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any>>} The updated usage record.
   */
  async updateFullUsage(usageId, usageDetails, lastResetAt = null, client = prisma) {
    const data = {
      updated_at: new Date(),
      usage_details: usageDetails,
    };
    if (lastResetAt) {
      data.last_reset_at = lastResetAt;
    }

    return client.plan_usages.update({
      data,
      where: { id: usageId },
    });
  }

  /**
   * Saves a historical snapshot of usage for a completed billing period.
   *
   * @param {object} historyData - The historical snapshot payload.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<{id: string}>} The newly created plan_usage_history record ID.
   */
  async saveUsageHistory(historyData, client = prisma) {
    const {
      plan_usage_id,
      user_id,
      workspace_id,
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

    return client.plan_usage_history.create({
      data: {
        final_usage_details,
        period_end,
        period_start,
        plan_id,
        plan_usage_id,
        total_ai_messages: total_ai_messages || 0,
        total_exports: total_exports || 0,
        total_notes_created: total_notes_created || 0,
        total_projects_created: total_projects_created || 0,
        total_storage_mb: total_storage_mb || 0,
        user_id,
        workspace_id,
      },
      select: { id: true },
    });
  }

  /**
   * Atomically adds multiple increment values to lifetime statistics in one operation.
   *
   * @param {string} usageId - The plan_usages ID.
   * @param {object} increments - Map of metric keys to numeric increment values.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<object>} The updated lifetime_stats payload.
   */
  async updateLifetimeStats(usageId, increments, client = prisma) {
    return client.$transaction(async (tx) => {
      const usage = await tx.plan_usages.findUnique({
        select: { lifetime_stats: true },
        where: { id: usageId },
      });

      if (!usage) return null;

      const lifetimeStats = usage.lifetime_stats || {};

      if (increments.notes) {
        lifetimeStats.total_notes_ever =
          (Number(lifetimeStats.total_notes_ever) || 0) + increments.notes;
      }
      if (increments.projects) {
        lifetimeStats.total_projects_ever =
          (Number(lifetimeStats.total_projects_ever) || 0) + increments.projects;
      }
      if (increments.ai_messages) {
        lifetimeStats.total_ai_messages_ever =
          (Number(lifetimeStats.total_ai_messages_ever) || 0) + increments.ai_messages;
      }
      if (increments.storage_mb) {
        lifetimeStats.total_storage_used_mb =
          (Number(lifetimeStats.total_storage_used_mb) || 0) + increments.storage_mb;
      }

      const updated = await tx.plan_usages.update({
        data: {
          lifetime_stats: lifetimeStats,
          updated_at: new Date(),
        },
        where: { id: usageId },
      });

      return updated.lifetime_stats;
    });
  }

  /**
   * Fetches historical billing cycle records, preferring the latest workspace context.
   *
   * @param {string} userId - The user ID.
   * @param {number} [limit=12] - Number of history items to fetch.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Array<Record<string, any>>>} A sorted array of history records.
   */
  async getUsageHistory(userId, limit = 12, client = prisma) {
    // Find latest workspace
    const latestWorkspace = await client.workspace_members.findFirst({
      orderBy: { created_at: "desc" },
      select: { workspace_id: true },
      where: {
        deleted: false,
        user_id: userId,
      },
    });

    const whereClause = {
      OR: [{ user_id: userId }],
    };

    if (latestWorkspace?.workspace_id) {
      whereClause.OR.push({ workspace_id: latestWorkspace.workspace_id });
    }

    return client.plan_usage_history
      .findMany({
        select: {
          created_at: true,
          id: true,
          period_end: true,
          period_start: true,
          total_ai_messages: true,
          total_exports: true,
          total_notes_created: true,
          total_projects_created: true,
          total_storage_mb: true,
          workspace_id: true,
        },
        where: whereClause,
      })
      .then((results) => {
        // Sort in JS: prioritize matching workspace over user, then period_end DESC
        return results
          .sort((a, b) => {
            const aIsOrg = a.workspace_id === latestWorkspace?.workspace_id;
            const bIsOrg = b.workspace_id === latestWorkspace?.workspace_id;
            if (aIsOrg && !bIsOrg) return -1;
            if (!aIsOrg && bIsOrg) return 1;
            return b.period_end.getTime() - a.period_end.getTime();
          })
          .slice(0, limit);
      });
  }

  /**
   * Fetches detailed monthly usage history for individual users specifically.
   *
   * @param {object} params
   * @param {string} params.userId - The user ID.
   * @param {number} [params.limit=6] - Number of records to return.
   * @param {number} [params.offset=0] - Pagination offset.
   * @param {string | null} [params.from=null] - ISO Date string for lower bound limit.
   * @param {string | null} [params.to=null] - ISO Date string for upper bound limit.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Array<Record<string, any>>>} An array of individual user history records.
   */
  async getIndividualUsageHistoryDetailed(
    { userId, limit = 6, offset = 0, from = null, to = null },
    client = prisma
  ) {
    const where = {
      user_id: userId,
      workspace_id: null,
    };

    if (from || to) {
      where.period_start = {};
      where.period_end = {};
      if (from) where.period_start.gte = new Date(from);
      if (to) where.period_end.lte = new Date(to);
    }

    const history = await client.plan_usage_history.findMany({
      include: {
        plans: { select: { name: true } },
      },
      orderBy: { period_end: "desc" },
      skip: offset,
      take: limit,
      where,
    });

    return history.map((h) => {
      const { plans, ...rest } = h;
      return {
        ...rest,
        plan_name: plans?.name || null,
      };
    });
  }

  /**
   * Assigns a specific plan directly to a user and ensures a local subscription entry.
   * Used predominantly for user-centric isolated plans rather than workspace plans.
   *
   * @param {string} userId - The user ID.
   * @param {string} planId - The plan ID to assign.
   * @param {PrismaClient} [client=prisma] - Optional Prisma client for transactions.
   * @returns {Promise<Record<string, any>>} The updated user record containing the assignment.
   */
  async assignPlanToUser(userId, planId, client = prisma) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const updateUserOp = client.users.update({
      data: {
        plan_id: planId,
        updated_at: now,
      },
      select: {
        plan_id: true,
        user_id: true,
      },
      where: { user_id: userId },
    });

    const upsertSubOp = client.subscriptions.upsert({
      create: {
        current_period_end: periodEnd,
        current_period_start: now,
        plan_id: planId,
        provider: "internal",
        status: "active",
        subscriber_id: userId,
        subscriber_type: "user",
      },
      update: {
        current_period_end: periodEnd,
        current_period_start: now,
        plan_id: planId,
        status: "active",
        updated_at: now,
      },
      where: {
        subscriber_type_subscriber_id: {
          subscriber_id: userId,
          subscriber_type: "user",
        },
      },
    });

    if (typeof client.$transaction === "function") {
      const [updatedUser] = await client.$transaction([updateUserOp, upsertSubOp]);
      return updatedUser;
    }

    const updatedUser = await updateUserOp;
    await upsertSubOp;
    return updatedUser;
  }
}

module.exports = new PlansRepository();
