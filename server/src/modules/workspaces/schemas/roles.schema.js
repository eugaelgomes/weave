const { z } = require("zod");

/**
 * Validates the request body for creating a role.
 */
const createRoleSchema = z.object({
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the role."),
  name: z.string().trim().min(1, "Name is required").describe("The name of the role."),
  permissions: z
    .array(z.string())
    .optional()
    .describe("List of permissions assigned to this role."),
});

/**
 * Validates the request body for updating a role.
 */
const updateRoleSchema = z.object({
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the role."),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .optional()
    .describe("The name of the role."),
  permissions: z
    .array(z.string())
    .optional()
    .describe("List of permissions assigned to this role."),
});

/**
 * Standardizes the role data response.
 */
const roleResponseSchema = z
  .object({
    created_at: z.union([z.string(), z.date()]).optional(),
    created_by: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    id: z.string(),
    is_system: z.boolean().optional(),
    name: z.string(),
    permissions: z.array(z.string()).optional(),
    updated_at: z.union([z.string(), z.date()]).optional(),
    workspace_id: z.string(),
  })
  .transform((role) => ({
    created_at: role.created_at,
    created_by: role.created_by,
    description: role.description,
    id: role.id,
    is_system: role.is_system,
    name: role.name,
    permissions: role.permissions || [],
    updated_at: role.updated_at,
    workspace_id: role.workspace_id,
  }));

module.exports = {
  createRoleSchema,
  roleResponseSchema,
  updateRoleSchema,
};
