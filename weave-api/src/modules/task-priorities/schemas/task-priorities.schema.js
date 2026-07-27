const { z } = require("zod");

/**
 * Validates route parameters containing UUIDs for task priorities.
 */
const taskPrioritiesParamsSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID format").optional(),
  priority_id: z.string().uuid("Invalid priority ID format").optional(),
  project_id: z.string().uuid("Invalid project ID format").optional(),
});

/**
 * Validates the request body for creating a new task priority.
 */
const createTaskPrioritySchema = z.object({
  color: z
    .string()
    .trim()
    .max(30, "Color string must be 30 characters or less")
    .optional()
    .nullable(),
  level: z.number().int("Level must be an integer"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  projectId: z.string().uuid("Invalid project ID format"),
});

/**
 * Validates the request body for updating an existing task priority.
 */
const updateTaskPrioritySchema = z.object({
  color: z
    .string()
    .trim()
    .max(30, "Color string must be 30 characters or less")
    .optional()
    .nullable(),
  level: z.number().int("Level must be an integer").optional(),
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be 100 characters or less")
    .optional(),
});

/**
 * Validates the parameters for deleting a task priority.
 */
const deleteTaskPrioritySchema = z.object({
  priorityId: z.string().uuid("Invalid priority ID format"),
  projectId: z.string().uuid("Invalid project ID format").optional(),
});

/**
 * Validates the query/parameters for listing task priorities.
 */
const listTaskPrioritiesSchema = z.object({
  projectId: z.string().uuid("Invalid project ID format").optional(),
});

module.exports = {
  createTaskPrioritySchema,
  deleteTaskPrioritySchema,
  listTaskPrioritiesSchema,
  taskPrioritiesParamsSchema,
  updateTaskPrioritySchema,
};
