const { z } = require("zod");

/**
 * Validates the request body for creating an organization.
 */
const createOrganizationSchema = z.object({
  banner_url: z
    .string()
    .url("Invalid banner URL")
    .optional()
    .nullable()
    .describe("The URL of the organization's banner image. Must be a valid URL."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the organization."),
  logo_url: z
    .string()
    .url("Invalid logo URL")
    .optional()
    .nullable()
    .describe("The URL of the organization's logo image. Must be a valid URL."),
  org_name: z
    .string()
    .trim()
    .min(1, "org_name is required")
    .describe("The display name of the organization."),
  settings: z
    .object({
      country: z.string().optional().describe("The 2-letter ISO country code of the organization."),
      default_locale: z
        .string()
        .optional()
        .describe("The default locale of the organization. Format ll-CC."),
      default_timezone: z.string().optional().describe("The default timezone of the organization."),
    })
    .passthrough()
    .optional()
    .nullable()
    .describe("A configuration object for the organization settings."),
  unique_name: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A globally unique identifier string for the organization."),
});

/**
 * Validates the request body for updating an organization.
 */
const updateOrganizationSchema = z.object({
  banner_url: z
    .string()
    .url("Invalid banner URL")
    .optional()
    .nullable()
    .describe("The URL of the organization's banner image. Must be a valid URL."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the organization."),
  logo_url: z
    .string()
    .url("Invalid logo URL")
    .optional()
    .nullable()
    .describe("The URL of the organization's logo image. Must be a valid URL."),
  org_name: z
    .string()
    .trim()
    .min(1, "org_name cannot be empty")
    .optional()
    .describe("The display name of the organization."),
  settings: z
    .record(z.any())
    .optional()
    .nullable()
    .describe("A configuration object for the organization settings."),
  unique_name: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A globally unique identifier string for the organization."),
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
};
