const { z } = require("zod");

/**
 * Validates the request body for creating an organization.
 */
const createOrganizationSchema = z.object({
  org_name: z.string().trim().min(1, "org_name is required"),
  unique_name: z.string().trim().optional().nullable(),
  logo_url: z.string().url("Invalid logo URL").optional().nullable(),
  banner_url: z.string().url("Invalid banner URL").optional().nullable(),
  description: z.string().trim().optional().nullable(),
  settings: z
    .object({
      default_timezone: z.string().optional(),
      default_locale: z.string().optional(),
      country: z.string().optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
});

/**
 * Validates the request body for updating an organization.
 */
const updateOrganizationSchema = z.object({
  org_name: z.string().trim().min(1, "org_name cannot be empty").optional(),
  unique_name: z.string().trim().optional().nullable(),
  logo_url: z.string().url("Invalid logo URL").optional().nullable(),
  banner_url: z.string().url("Invalid banner URL").optional().nullable(),
  description: z.string().trim().optional().nullable(),
  settings: z.record(z.any()).optional().nullable(),
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
};
