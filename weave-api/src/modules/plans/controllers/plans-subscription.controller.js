const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { executeQuery } = require("@/database/connection");

class PlansSubscriptionController {
  /**
   * GET /plans/subscription
   * Returns the current subscription status for the authenticated user.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getSubscription(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const effective = await PlansRepository.getEffectivePlanByUserId(userId);
      if (!effective?.plan_id) {
        return res
          .status(404)
          .json({ message: "No active subscription found" });
      }

      const subscription = await this._getSubscriptionRow(
        effective.subscriber_type,
        effective.subscriber_id
      );

      return res.status(200).json({
        plan_details: effective.plan_details,
        subscription: {
          cancel_at_period_end: subscription?.cancel_at_period_end || false,
          current_period_end: subscription?.current_period_end || null,
          current_period_start: subscription?.current_period_start || null,
          plan_id: effective.plan_id,
          plan_name: effective.plan_name,
          plan_version: effective.plan_version,
          provider: subscription?.provider || "internal",
          status: subscription?.status || "active",
          subscriber_id: effective.subscriber_id,
          subscriber_type: effective.subscriber_type,
          trial_end: subscription?.trial_end || null,
          trial_start: subscription?.trial_start || null,
        },
      });
    } catch (err) {
      console.error("[PlansSubscriptionController.getSubscription]", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * PUT /plans/subscription
   * Change plan (upgrade/downgrade) for the authenticated user or their organization.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async changePlan(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { planId } = req.body;
      if (!planId) {
        return res.status(400).json({ message: "planId is required" });
      }

      const targetPlan = await PlansRepository.getPlanById(planId);
      if (!targetPlan) {
        return res.status(404).json({ message: "Target plan not found" });
      }

      const effective = await PlansRepository.getEffectivePlanByUserId(userId);
      if (!effective) {
        return res
          .status(404)
          .json({ message: "No active subscription found" });
      }

      if (effective.plan_id === planId) {
        return res.status(409).json({ message: "Already on this plan" });
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

      return res.status(200).json({
        message: "Plan changed successfully",
        plan: {
          id: targetPlan.plan_id,
          name: targetPlan.name,
        },
        warnings: downgradWarnings,
      });
    } catch (err) {
      console.error("[PlansSubscriptionController.changePlan]", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * POST /plans/subscription/cancel
   * Schedule cancellation at end of current billing period.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async cancelSubscription(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const effective = await PlansRepository.getEffectivePlanByUserId(userId);
      if (!effective) {
        return res
          .status(404)
          .json({ message: "No active subscription found" });
      }

      const subscription = await this._getSubscriptionRow(
        effective.subscriber_type,
        effective.subscriber_id
      );

      if (!subscription) {
        return res
          .status(404)
          .json({ message: "Subscription record not found" });
      }

      if (subscription.cancel_at_period_end) {
        return res
          .status(409)
          .json({ message: "Cancellation already scheduled" });
      }

      await executeQuery(
        `UPDATE subscriptions
         SET cancel_at_period_end = true, updated_at = NOW()
         WHERE subscriber_type = $1 AND subscriber_id = $2
           AND status IN ('active', 'past_due', 'trialing')`,
        [effective.subscriber_type, effective.subscriber_id]
      );

      return res.status(200).json({
        current_period_end: subscription.current_period_end,
        message: "Cancellation scheduled at end of current period",
      });
    } catch (err) {
      console.error("[PlansSubscriptionController.cancelSubscription]", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  /**
   * @param {string} subscriberType
   * @param {string} subscriberId
   * @returns {Promise<Record<string, any> | null>}
   */
  async _getSubscriptionRow(subscriberType, subscriberId) {
    const rows = await executeQuery(
      `SELECT * FROM subscriptions
       WHERE subscriber_type = $1 AND subscriber_id = $2
       ORDER BY updated_at DESC LIMIT 1`,
      [subscriberType, subscriberId]
    );
    return rows[0] || null;
  }

  /**
   * @param {string} subscriberType
   * @param {string} subscriberId
   * @param {Record<string, any>} targetPlan
   */
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

  /**
   * Returns warnings if current usage exceeds new plan limits (informational, not blocking).
   *
   * @param {Record<string, any> | undefined} usageDetails
   * @param {Record<string, any> | undefined} newPlanDetails
   * @returns {string[]}
   */
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
      const current = this._getNestedValue(usageDetails, check.usage) || 0;
      const limit = this._getNestedValue(newPlanDetails, check.limit);
      if (limit !== null && limit !== undefined && current > limit) {
        warnings.push(
          `Current ${check.label} (${current}) exceeds new plan limit (${limit}).`
        );
      }
    }

    return warnings;
  }

  /**
   * @param {Record<string, any>} obj
   * @param {string} path
   * @returns {any}
   */
  _getNestedValue(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }
}

module.exports = new PlansSubscriptionController();
