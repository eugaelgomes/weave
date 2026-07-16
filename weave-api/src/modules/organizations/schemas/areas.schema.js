const { z } = require("zod");

/**
 * Validates the request body for adding an area member.
 */
const addAreaMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]).optional().default("MEMBER"),
  user_id: z.string().uuid("Invalid user ID format"),
});

/**
 * Validates the request body for updating an area member.
 */
const updateAreaMemberSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "GUEST"], {
    errorMap: () => ({
      message: "Invalid area member role. Use ADMIN, MEMBER or GUEST",
    }),
  }),
});

/**
 * Validates the request body for creating a new area.
 */
const createAreaSchema = z.object({
  area_name: z.string().trim().min(1, "area_name is required"),
  description: z.string().trim().optional().nullable(),
  parent_area_id: z
    .string()
    .uuid("Invalid parent area ID")
    .optional()
    .nullable(),
  properties: z.record(z.any()).optional().nullable(),
  slug: z.string().trim().optional().nullable(),
});

/**
 * Validates the request body for updating an area.
 */
const updateAreaSchema = z.object({
  active: z.boolean().optional(),
  area_name: z.string().trim().min(1, "area_name cannot be empty").optional(),
  description: z.string().trim().optional().nullable(),
  parent_area_id: z
    .string()
    .uuid("Invalid parent area ID")
    .optional()
    .nullable(),
  properties: z.record(z.any()).optional(),
  slug: z.string().trim().optional(),
});

module.exports = {
  addAreaMemberSchema,
  createAreaSchema,
  updateAreaMemberSchema,
  updateAreaSchema,
};
