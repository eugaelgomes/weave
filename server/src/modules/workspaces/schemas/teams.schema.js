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
const createTeamSchema = z
  .object({
    area_name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional().nullable(),
    name: z.string().trim().min(1).optional(),
    parent_area_id: z.string().uuid("Invalid parent area ID").optional().nullable(),
    parent_team_id: z.string().uuid("Invalid parent team ID").optional().nullable(),
    properties: z.record(z.any()).optional().nullable(),
    slug: z.string().trim().optional().nullable(),
    team_name: z.string().trim().min(1).optional(),
  })
  .refine((data) => Boolean(data.team_name || data.name || data.area_name), {
    message: "team_name or area_name is required",
    path: ["team_name"],
  });

/**
 * Validates the request body for updating an team.
 */
const updateTeamSchema = z.object({
  active: z.boolean().optional().describe("Indicates whether the team is active."),
  area_name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1).optional(),
  parent_area_id: z.string().uuid("Invalid parent area ID").optional().nullable(),
  parent_team_id: z.string().uuid("Invalid parent team ID").optional().nullable(),
  properties: z.record(z.any()).optional().nullable(),
  slug: z.string().trim().optional(),
  team_name: z.string().trim().min(1).optional(),
});

/**
 * Standardizes the team data response.
 */
const teamResponseSchema = z
  .object({
    active: z.boolean().optional(),
    color: z.string().nullable().optional(),
    created_at: z.union([z.string(), z.date()]).optional(),
    created_by: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    icon: z.any().optional(),
    id: z.string(),
    name: z.string().optional(),
    parent_team_id: z.string().nullable().optional(),
    properties: z.any().optional(),
    public_id: z.string().optional(),
    slug: z.string().nullable().optional(),
    team_name: z.string().optional(),
    updated_at: z.union([z.string(), z.date()]).optional(),
    visibility: z.string().optional(),
    workspace_id: z.string(),
  })
  .transform((team) => {
    const teamName = team.team_name || team.name || "";
    return {
      active: team.active ?? true,
      area_name: teamName,
      color: team.color || null,
      created_at: team.created_at,
      created_by: team.created_by,
      description: team.description || "",
      icon: team.icon || {},
      id: team.id,
      name: teamName,
      parent_area_id: team.parent_team_id || null,
      parent_team_id: team.parent_team_id || null,
      properties: team.properties || {},
      public_id: team.public_id,
      slug: team.slug,
      team_name: teamName,
      updated_at: team.updated_at,
      visibility: team.visibility,
      workspace_id: team.workspace_id,
    };
  });

module.exports = {
  addTeamMemberSchema,
  createTeamSchema,
  teamResponseSchema,
  updateTeamMemberSchema,
  updateTeamSchema,
};
