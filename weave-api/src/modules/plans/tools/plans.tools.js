const {
  getCurrentPlanSchema,
  listAvailablePlansSchema,
} = require("../schemas/plans.schema");
const PlansRepository = require("../repositories/plans.repository");

/**
 * Creates the Plans tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The tools definition map.
 */
const createPlansTools = (user) => ({
  get_current_plan: {
    description:
      "Get the current subscription plan for the authenticated user.",
    handler: async () => {
      try {
        const result = await PlansRepository.getUserWithPlan(user.id);

        if (!result) {
          throw new Error("No active plan found for the user.");
        }

        return {
          content: [
            {
              text: JSON.stringify(result, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error getting current plan: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "get_current_plan",
    schema: getCurrentPlanSchema,
  },
  list_available_plans: {
    description: "List all available subscription plans in the system.",
    handler: async () => {
      try {
        const result = await PlansRepository.getAllPlans();

        return {
          content: [
            {
              text: JSON.stringify(result, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing available plans: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_available_plans",
    schema: listAvailablePlansSchema,
  },
});

module.exports = {
  createPlansTools,
};
