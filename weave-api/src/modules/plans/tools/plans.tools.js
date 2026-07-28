const PlansService = require("../services/plans.service");
const { managePlansSchema } = require("../schemas/plans.schema");

const createPlansTools = (user) => ({
  manage_plans: {
    description: "Manage subscription plans (get_current, list_available).",
    handler: async (args) => {
      try {
        const { action } = args;
        const userId = user?.userId || user?.id;

        if (action === "get_current") {
          const result = await PlansService.getCurrentPlan(userId);
          if (!result) throw new Error("No active plan found for the user.");
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
  },
});

module.exports = {
  createPlansTools,
};
