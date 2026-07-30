const { z } = require("zod");
const { uuidSchema } = require("@/utils/mcp-schemas.util");

const changePlanSchema = z
  .object({
    plan_id: uuidSchema.describe(
      "The unique identifier of the target subscription plan to switch the user to."
    ),
  })
  .describe(
    "Schema for modifying the active subscription plan of the authenticated user."
  );

const getCurrentPlanSchema = z
  .object({})
  .describe(
    "Schema used for retrieving the current active subscription plan details and parameters for the authenticated user."
  );

const listAvailablePlansSchema = z
  .object({})
  .describe(
    "Schema used for listing all available subscription plans that are configured in the system."
  );

const managePlansSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("get_current"),
    })
    .describe(
      "Action to retrieve the current active subscription plan details for the user."
    ),
  z
    .object({
      action: z.literal("list_available"),
    })
    .describe("Action to list all available subscription plans in the system."),
]);

module.exports = {
  changePlanSchema,
  getCurrentPlanSchema,
  listAvailablePlansSchema,
  managePlansSchema,
};
