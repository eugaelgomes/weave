const { z } = require("zod");
const {
  ORGANIZATION_BUSINESS_ROLES,
} = require("@/modules/workspaces/utils/workspace-creation-steps.util");

/**
 * Validates the request body for saving workspace creation step 1.
 */
const saveStepOneSchema = z.object({
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, "country must use 2-letter ISO code (example: US, BR)")
    .optional()
    .nullable(),
  default_locale: z
    .string()
    .regex(/^[a-z]{2}-[A-Z]{2}$/, "default_locale must use format ll-CC (example: en-US)")
    .optional()
    .nullable(),
  description: z.string().trim().optional().nullable(),
  language: z.string().trim().optional().nullable(),
  logo_url: z.string().url("Invalid logo URL").optional().nullable(),
  org_name: z.string().trim().min(1, "org_name is required"),
  organization_role: z.enum(ORGANIZATION_BUSINESS_ROLES, {
    errorMap: () => ({
      message: `organization_role must be one of: ${ORGANIZATION_BUSINESS_ROLES.join(", ")}`,
    }),
  }),
  unique_name: z.string().trim().min(1, "unique_name is required"),
});

module.exports = {
  saveStepOneSchema,
};
