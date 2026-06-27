const { z } = require("zod");

/**
 * Validates route parameters containing UUIDs for task priorities.
 */
const taskPrioritiesParamsSchema = z.object({
  project_id: z.string().uuid("Invalid project ID format").optional(),
  org_id: z.string().uuid("Invalid organization ID format").optional(),
  priority_id: z.string().uuid("Invalid priority ID format").optional(),
});

/**
 * Validates the request body for creating a new task priority.
 */
const createTaskPrioritySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  level: z.number().int("Level must be an integer"),
  color: z
    .string()
    .trim()
    .max(30, "Color string must be 30 characters or less")
    .optional()
    .nullable(),
});

/**
 * Validates the request body for updating an existing task priority.
 */
const updateTaskPrioritySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be 100 characters or less")
    .optional(),
  level: z.number().int("Level must be an integer").optional(),
  color: z
    .string()
    .trim()
    .max(30, "Color string must be 30 characters or less")
    .optional()
    .nullable(),
});

module.exports = {
  taskPrioritiesParamsSchema,
  createTaskPrioritySchema,
  updateTaskPrioritySchema,
};
