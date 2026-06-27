const { z } = require("zod");

/**
 * Validates route parameters containing UUIDs.
 */
const tagsParamsSchema = z.object({
  project_id: z.string().uuid("Invalid project ID format").optional(),
  org_id: z.string().uuid("Invalid organization ID format").optional(),
  tag_id: z.string().uuid("Invalid tag ID format").optional(),
});

/**
 * Validates the request body for creating a new tag.
 */
const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name is required")
    .max(100, "Tag name must be 100 characters or less"),
  color: z
    .string()
    .trim()
    .max(30, "Color string must be 30 characters or less")
    .optional()
    .nullable(),
});

/**
 * Validates the request body for updating an existing tag.
 */
const updateTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name cannot be empty")
    .max(100, "Tag name must be 100 characters or less")
    .optional(),
  color: z
    .string()
    .trim()
    .max(30, "Color string must be 30 characters or less")
    .optional()
    .nullable(),
});

module.exports = {
  tagsParamsSchema,
  createTagSchema,
  updateTagSchema,
};
