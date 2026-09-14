const { z } = require("zod");

/**
 * Validates the request body for creating an workspace.
 */
const createWorkspaceSchema = z.object({
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
  workspace_name: z
    .string()
    .trim()
    .min(1, "workspace_name is required")
    .describe("The display name of the workspace."),
});

/**
 * Validates the request body for updating an workspace.
 */
const updateWorkspaceSchema = z.object({
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
  workspace_name: z
    .string()
    .trim()
    .min(1, "workspace_name cannot be empty")
    .optional()
    .describe("The display name of the workspace."),
});

/**
 * Standardizes the workspace data response.
 */
const workspaceResponseSchema = z
  .object({
    avatar_url: z.string().nullable().optional(),
    banner_url: z.string().nullable().optional(),
    created_at: z.union([z.string(), z.date()]).optional(),
    deleted: z.boolean().optional().default(false),
    description: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    id: z.string(),
    logo_url: z.string().nullable().optional(),
    member_role: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    public_id: z.string(),
    settings: z.any().optional().nullable(),
    unique_name: z.string().nullable().optional(),
    updated_at: z.union([z.string(), z.date()]).optional(),
    user_id: z.string(),
    username: z.string().nullable().optional(),
    workspace_name: z.string(),
  })
  .transform((data) => ({
    created_at: data.created_at,
    deleted: data.deleted,
    identity: {
      banner_url: data.banner_url || null,
      description: data.description || null,
      id: data.id,
      logo_url: data.logo_url || null,
      member_role: data.member_role ?? null,
      public_id: data.public_id,
      unique_name: data.unique_name || null,
      user_id: data.user_id,
      workspace_name: data.workspace_name,
      workspace_name: data.workspace_name,
    },
    owners: [
      {
        avatar_url: data.avatar_url || null,
        email: data.email || null,
        id: data.user_id,
        name: data.name || null,
        username: data.username || null,
      },
    ],
    properties: data.settings || {},
    settings: data.settings || {},
    updated_at: data.updated_at,
  }));

module.exports = {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceResponseSchema,
};
