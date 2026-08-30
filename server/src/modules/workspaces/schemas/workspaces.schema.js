const { z } = require("zod");

/**
 * Validates the request body for creating an workspace.
 */
const createOrganizationSchema = z.object({
  banner_url: z
    .string()
    .url("Invalid banner URL")
    .optional()
    .nullable()
    .describe("The URL of the workspace's banner image. Must be a valid URL."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the workspace."),
  logo_url: z
    .string()
    .url("Invalid logo URL")
    .optional()
    .nullable()
    .describe("The URL of the workspace's logo image. Must be a valid URL."),
  org_name: z
    .string()
    .trim()
    .min(1, "org_name is required")
    .describe("The display name of the workspace."),
  settings: z
    .object({
      country: z.string().optional().describe("The 2-letter ISO country code of the workspace."),
      default_locale: z
        .string()
        .optional()
        .describe("The default locale of the workspace. Format ll-CC."),
      default_timezone: z.string().optional().describe("The default timezone of the workspace."),
    })
    .passthrough()
    .optional()
    .nullable()
    .describe("A configuration object for the workspace settings."),
  unique_name: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A globally unique identifier string for the workspace."),
});

/**
 * Validates the request body for updating an workspace.
 */
const updateOrganizationSchema = z.object({
  banner_url: z
    .string()
    .url("Invalid banner URL")
    .optional()
    .nullable()
    .describe("The URL of the workspace's banner image. Must be a valid URL."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the workspace."),
  logo_url: z
    .string()
    .url("Invalid logo URL")
    .optional()
    .nullable()
    .describe("The URL of the workspace's logo image. Must be a valid URL."),
  org_name: z
    .string()
    .trim()
    .min(1, "org_name cannot be empty")
    .optional()
    .describe("The display name of the workspace."),
  settings: z
    .record(z.any())
    .optional()
    .nullable()
    .describe("A configuration object for the workspace settings."),
  unique_name: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A globally unique identifier string for the workspace."),
});

module.exports = {
  createOrganizationSchema,
  updateOrganizationSchema,
};
