const { z } = require("zod");

const changePlanSchema = z
  .object({
    planId: z
      .string()
      .min(1, "planId is required")
      .describe(
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
  z.object({
    action: z.literal("get_current"),
  }),
  z.object({
    action: z.literal("list_available"),
  }),
]);

module.exports = {
  changePlanSchema,
  getCurrentPlanSchema,
  listAvailablePlansSchema,
  managePlansSchema,
};
