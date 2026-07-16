const { z } = require("zod");

/**
 * Validates the request body for creating an organization.
 */
const createOrganizationSchema = z.object({
  banner_url: z.string().url("Invalid banner URL").optional().nullable(),
  description: z.string().trim().optional().nullable(),
  logo_url: z.string().url("Invalid logo URL").optional().nullable(),
  org_name: z.string().trim().min(1, "org_name is required"),
  settings: z
    .object({
      country: z.string().optional(),
      default_locale: z.string().optional(),
      default_timezone: z.string().optional(),
    })
    .passthrough()
    .optional()
    .nullable(),
  unique_name: z.string().trim().optional().nullable(),
});

/**
 * Validates the request body for updating an organization.
 */
const updateOrganizationSchema = z.object({
  banner_url: z.string().url("Invalid banner URL").optional().nullable(),
  description: z.string().trim().optional().nullable(),
  logo_url: z.string().url("Invalid logo URL").optional().nullable(),
  org_name: z.string().trim().min(1, "org_name cannot be empty").optional(),
  settings: z.record(z.any()).optional().nullable(),
  unique_name: z.string().trim().optional().nullable(),
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
};
