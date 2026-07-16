const { z } = require("zod");

const getSprintsSchema = z.object({
  end_from: z.string().optional(),
  end_to: z.string().optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  sort: z.string().max(64).optional(),
  start_from: z.string().optional(),
  start_to: z.string().optional(),
  status: z.string().max(120).optional(),
});

const getReasoningsSchema = z.object({
  created_by: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  is_dismissed: z.enum(["true", "false"]).optional(),
  is_pinned: z.enum(["true", "false"]).optional(),
  is_read: z.enum(["true", "false"]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  page: z.union([z.string(), z.number()]).optional(),
  reasoningType: z.string().max(64).optional(),
  sort: z.string().max(64).optional(),
  sprintId: z.string().uuid().optional(),
  to: z.string().datetime().optional(),
});

const engineContextParamSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
});

const reasoningParamsSchema = z.object({
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
  reasoningId: z.string().uuid("reasoningId must be a valid UUID"),
});

module.exports = {
  engineContextParamSchema,
  getReasoningsSchema,
  getSprintsSchema,
  reasoningParamsSchema,
};
