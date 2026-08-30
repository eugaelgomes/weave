const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const PlansService = require("../services/plans.service");

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
        return res.status(404).json({ message: "No active subscription found" });
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
   * Change plan (upgrade/downgrade) for the authenticated user or their workspace.
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

      const { plan_id, planId } = req.body;
      const targetPlanId = plan_id || planId;

      if (!targetPlanId) {
        return res.status(400).json({ message: "plan_id is required" });
      }

      const result = await PlansService.changePlan(userId, targetPlanId);

      return res.status(200).json({
        message: "Plan changed successfully",
        plan: result.plan,
        warnings: result.warnings,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
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

      const result = await PlansService.cancelSubscription(userId);

      return res.status(200).json({
        current_period_end: result.current_period_end,
        message: "Cancellation scheduled at end of current period",
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      console.error("[PlansSubscriptionController.cancelSubscription]", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = new PlansSubscriptionController();
