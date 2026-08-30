const { z } = require("zod");

/**
 * Validates the request body for adding an team member.
 */
const addTeamMemberSchema = z.object({
  role: z
    .string()
    .uuid("Invalid role ID format")
    .describe("The role UUID for the member in the team."),
  user_id: z
    .string()
    .uuid("Invalid user ID format")
    .describe("The universally unique identifier of the user to be added."),
});

/**
 * Validates the request body for updating an team member.
 */
const updateTeamMemberSchema = z.object({
  role: z
    .string()
    .uuid("Invalid role ID format")
    .describe("The role UUID for the member in the team."),
});

/**
 * Validates the request body for creating a new team.
 */
const createTeamSchema = z.object({
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the team."),
  parent_team_id: z
    .string()
    .uuid("Invalid parent team ID")
    .optional()
    .nullable()
    .describe("The universally unique identifier of the parent team, if this is a sub-team."),
  properties: z
    .record(z.any())
    .optional()
    .nullable()
    .describe("A configuration object for custom team properties."),
  slug: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A URL-friendly identifier string for the team."),
  team_name: z
    .string()
    .trim()
    .min(1, "team_name is required")
    .describe("The display name of the team."),
});

/**
 * Validates the request body for updating an team.
 */
const updateTeamSchema = z.object({
  active: z.boolean().optional().describe("Indicates whether the team is active."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the team."),
  parent_team_id: z
    .string()
    .uuid("Invalid parent team ID")
    .optional()
    .nullable()
    .describe("The universally unique identifier of the parent team, if this is a sub-team."),
  properties: z
    .record(z.any())
    .optional()
    .describe("A configuration object for custom team properties."),
  slug: z.string().trim().optional().describe("A URL-friendly identifier string for the team."),
  team_name: z
    .string()
    .trim()
    .min(1, "team_name cannot be empty")
    .optional()
    .describe("The display name of the team."),
});

/**
 * Standardizes the team data response.
 */
const teamResponseSchema = z
  .object({
    active: z.boolean().optional(),
    created_at: z.union([z.string(), z.date()]).optional(),
    created_by: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    id: z.string(),
    parent_team_id: z.string().nullable().optional(),
    properties: z.any().optional(),
    slug: z.string().nullable().optional(),
    team_name: z.string(),
    updated_at: z.union([z.string(), z.date()]).optional(),
    workspace_id: z.string(),
  })
  .transform((team) => ({
    active: team.active,
    created_at: team.created_at,
    created_by: team.created_by,
    description: team.description,
    id: team.id,
    parent_team_id: team.parent_team_id,
    properties: team.properties || {},
    slug: team.slug,
    team_name: team.team_name,
    updated_at: team.updated_at,
    workspace_id: team.workspace_id,
  }));

module.exports = {
  addTeamMemberSchema,
  createTeamSchema,
  teamResponseSchema,
  updateTeamMemberSchema,
  updateTeamSchema,
};
