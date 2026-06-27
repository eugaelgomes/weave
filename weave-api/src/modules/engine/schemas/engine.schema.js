const { z } = require("zod");

const getSprintsSchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  sort: z.string().max(64).optional(),
  status: z.string().max(120).optional(),
  start_from: z.string().optional(),
  start_to: z.string().optional(),
  end_from: z.string().optional(),
  end_to: z.string().optional(),
});

const getReasoningsSchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  sort: z.string().max(64).optional(),
  sprintId: z.string().uuid().optional(),
  reasoningType: z.string().max(64).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  is_read: z.enum(["true", "false"]).optional(),
  is_pinned: z.enum(["true", "false"]).optional(),
  is_dismissed: z.enum(["true", "false"]).optional(),
  created_by: z.string().uuid().optional(),
});

const engineContextParamSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
});

const reasoningParamsSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
  reasoningId: z.string().uuid("reasoningId must be a valid UUID"),
});

module.exports = {
  getSprintsSchema,
  getReasoningsSchema,
  engineContextParamSchema,
  reasoningParamsSchema,
};
