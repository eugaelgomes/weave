const { z } = require("zod");

/**
 * Validates the request body for adding an area member.
 */
const addAreaMemberSchema = z.object({
  role: z
    .enum(["ADMIN", "MEMBER", "GUEST"])
    .optional()
    .default("MEMBER")
    .describe(
      "The role of the member in the area. Valid roles: ADMIN, MEMBER, GUEST."
    ),
  user_id: z
    .string()
    .uuid("Invalid user ID format")
    .describe("The universally unique identifier of the user to be added."),
});

/**
 * Validates the request body for updating an area member.
 */
const updateAreaMemberSchema = z.object({
  role: z
    .enum(["ADMIN", "MEMBER", "GUEST"], {
      errorMap: () => ({
        message: "Invalid area member role. Use ADMIN, MEMBER or GUEST",
      }),
    })
    .describe(
      "The role of the member in the area. Valid roles: ADMIN, MEMBER, GUEST."
    ),
});

/**
 * Validates the request body for creating a new area.
 */
const createAreaSchema = z.object({
  area_name: z
    .string()
    .trim()
    .min(1, "area_name is required")
    .describe("The display name of the area."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the area."),
  parent_area_id: z
    .string()
    .uuid("Invalid parent area ID")
    .optional()
    .nullable()
    .describe(
      "The universally unique identifier of the parent area, if this is a sub-area."
    ),
  properties: z
    .record(z.any())
    .optional()
    .nullable()
    .describe("A configuration object for custom area properties."),
  slug: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A URL-friendly identifier string for the area."),
});

/**
 * Validates the request body for updating an area.
 */
const updateAreaSchema = z.object({
  active: z
    .boolean()
    .optional()
    .describe("Indicates whether the area is active."),
  area_name: z
    .string()
    .trim()
    .min(1, "area_name cannot be empty")
    .optional()
    .describe("The display name of the area."),
  description: z
    .string()
    .trim()
    .optional()
    .nullable()
    .describe("A detailed description of the area."),
  parent_area_id: z
    .string()
    .uuid("Invalid parent area ID")
    .optional()
    .nullable()
    .describe(
      "The universally unique identifier of the parent area, if this is a sub-area."
    ),
  properties: z
    .record(z.any())
    .optional()
    .describe("A configuration object for custom area properties."),
  slug: z
    .string()
    .trim()
    .optional()
    .describe("A URL-friendly identifier string for the area."),
});

module.exports = {
  addAreaMemberSchema,
  createAreaSchema,
  updateAreaMemberSchema,
  updateAreaSchema,
};
