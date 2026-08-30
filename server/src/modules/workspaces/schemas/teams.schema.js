const { z } = require("zod");

/**
 * Validates the request body for adding an team member.
 */
const addAreaMemberSchema = z.object({
  role: z
    .enum(["ADMIN", "MEMBER", "GUEST"])
    .optional()
    .default("MEMBER")
    .describe("The role of the member in the team. Valid roles: ADMIN, MEMBER, GUEST."),
  user_id: z
    .string()
    .uuid("Invalid user ID format")
    .describe("The universally unique identifier of the user to be added."),
});

/**
 * Validates the request body for updating an team member.
 */
const updateAreaMemberSchema = z.object({
  role: z
    .enum(["ADMIN", "MEMBER", "GUEST"], {
      errorMap: () => ({
        message: "Invalid team member role. Use ADMIN, MEMBER or GUEST",
      }),
    })
    .describe("The role of the member in the team. Valid roles: ADMIN, MEMBER, GUEST."),
});

/**
 * Validates the request body for creating a new team.
 */
const createAreaSchema = z.object({
  area_name: z
    .string()
    .trim()
    .min(1, "area_name is required")
    .describe("The display name of the team."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the team."),
  parent_area_id: z
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
});

/**
 * Validates the request body for updating an team.
 */
const updateAreaSchema = z.object({
  active: z.boolean().optional().describe("Indicates whether the team is active."),
  area_name: z
    .string()
    .trim()
    .min(1, "area_name cannot be empty")
    .optional()
    .describe("The display name of the team."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the team."),
  parent_area_id: z
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
});

/**
 * Standardizes the team data response.
 */
const teamResponseSchema = z
  .object({
    active: z.boolean().optional(),
    area_name: z.string(),
    created_at: z.union([z.string(), z.date()]).optional(),
    created_by: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    id: z.string(),
    organization_id: z.string(),
    parent_area_id: z.string().nullable().optional(),
    properties: z.any().optional(),
    slug: z.string().nullable().optional(),
    updated_at: z.union([z.string(), z.date()]).optional(),
  })
  .transform((team) => ({
    active: team.active,
    area_name: team.area_name,
    created_at: team.created_at,
    created_by: team.created_by,
    description: team.description,
    id: team.id,
    organization_id: team.organization_id,
    parent_area_id: team.parent_area_id,
    properties: team.properties || {},
    slug: team.slug,
    updated_at: team.updated_at,
  }));

module.exports = {
  addAreaMemberSchema,
  createAreaSchema,
  teamResponseSchema,
  updateAreaMemberSchema,
  updateAreaSchema,
};
