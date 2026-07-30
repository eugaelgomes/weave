const PlansService = require("../services/plans.service");
const { managePlansSchema } = require("../schemas/plans.schema");
const { API_SCOPES } = require("@/config/api-scopes");

const createPlansTools = (user) => ({
  manage_plans: {
    description: `Manage Weave Notes subscription plans, usage limits, and quotas.
FUNCTIONALITIES (Actions):
1. 'get_current': Retrieves the active plan details.
   - How to use: Provide 'action' as "get_current". No extra arguments are required.
   - What it does: Returns the authenticated user's current subscription plan, including lifetime statistics and the current monthly cycle usage limits (such as max notes, AI messages, exports, and storage limits). Use this to verify if a user has reached their quota before performing restricted operations.
2. 'list_available': Lists all available subscription plans.
   - How to use: Provide 'action' as "list_available". No extra arguments are required.
   - What it does: Returns a list of all active plans configured in the Weave system, exposing their public benefits, names, and pricing structures. Use this to present downgrade/upgrade options to the user.`,

    handler: async (args) => {
      try {
        const { action } = args;
        const userId = user?.userId || user?.id;

        if (action === "get_current") {
          const plan = await PlansService.getCurrentPlan(userId);
          if (!plan) throw new Error("No active plan found for the user.");

          let usage = null;
          try {
            usage = await PlansService.managePlanUsage(userId);
          } catch (e) {
            console.warn("Could not fetch plan usage for user:", e.message);
          }

          const result = {
            plan_details: plan.plan_details,
            plan_id: plan.plan_id,
            subscriber_id: plan.subscriber_id,
            subscriber_type: plan.subscriber_type,
            usage_metrics: usage
              ? {
                  current_period_cycle: usage.usage_details,
                  lifetime_stats: usage.lifetime_stats,
                }
              : null,
          };

          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "list_available") {
          const result = await PlansService.listAvailablePlans();
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            { text: `Error managing plans: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "manage_plans",
    schema: managePlansSchema,
    scopes: [API_SCOPES.PROFILE_READ],
  },
});

module.exports = {
  createPlansTools,
};
