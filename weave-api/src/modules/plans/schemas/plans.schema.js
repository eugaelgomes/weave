const { z } = require("zod");
const { uuidSchema } = require("@/utils/mcp-schemas.util");

const changePlanSchema = z
  .object({
    plan_id: uuidSchema.describe(
      "The unique identifier of the target subscription plan to switch the user to."
    ),
  })
  .describe("Schema for modifying the active subscription plan of the authenticated user.");

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

const managePlansSchema = z.object({
  action: z
    .enum(["get_current", "list_available"])
    .describe(
      "Action to perform: 'get_current' to retrieve current active plan, 'list_available' to list all available plans."
    ),
});

module.exports = {
  changePlanSchema,
  getCurrentPlanSchema,
  listAvailablePlansSchema,
  managePlansSchema,
};
