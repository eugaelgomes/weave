const { z } = require("zod");
const PlansRepository = require("../repositories/plans.repository");

const managePlansSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("get_current"),
  }),
  z.object({
    action: z.literal("list_available"),
  }),
]);

const createPlansTools = (user) => ({
  manage_plans: {
    description: "Manage subscription plans (get_current, list_available).",
    handler: async (args) => {
      try {
        const { action } = args;

        if (action === "get_current") {
          const result = await PlansRepository.getUserWithPlan(user.userId);
          if (!result) throw new Error("No active plan found for the user.");
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "list_available") {
          const result = await PlansRepository.getAllPlans();
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
