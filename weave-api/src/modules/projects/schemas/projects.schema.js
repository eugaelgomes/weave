const { z } = require("zod");

const getProjectsSchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  sort: z.string().max(64).optional(),
  include: z.string().max(200).optional(),
  search: z.string().max(120).optional(),
  status: z.string().max(200).optional(),
  methodology: z.string().max(120).optional(),
  visibility: z.string().max(120).optional(),
  ownership: z
    .enum(["owned", "collaborating", "all", "OWNED", "COLLABORATING", "ALL"])
    .optional(),
  owner_user_id: z.string().uuid().optional(),
  collaborator_user_id: z.string().uuid().optional(),
  organization_id: z.string().uuid().optional(),
  parent_only: z.enum(["true", "false"]).optional(),
  has_parent: z.enum(["true", "false"]).optional(),
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),
  updated_from: z.string().datetime().optional(),
  updated_to: z.string().datetime().optional(),
  start_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  start_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  target_end_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  target_end_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  progress_min: z.union([z.string(), z.number()]).optional(),
  progress_max: z.union([z.string(), z.number()]).optional(),
  priority: z.string().max(80).optional(),
  tags: z.string().max(2000).optional(),
  active: z.enum(["true", "false"]).optional(),
});

const getProjectByIdSchema = z.object({
  include: z.string().max(200).optional(),
});

const getProjectStagesSchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  sort: z.string().max(64).optional(),
  include_done: z.enum(["true", "false"]).optional(),
  search: z.string().max(80).optional(),
});

const getProjectNotesSchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  sort: z.string().max(64).optional(),
  search: z.string().max(120).optional(),
  status: z.string().max(120).optional(),
  priority_id: z.string().max(800).optional(),
  tags: z.string().max(4000).optional(),
  stage_id: z.string().max(800).optional(),
  created_by: z.string().max(800).optional(),
  collaborator_user_id: z.string().max(800).optional(),
  due_from: z.string().datetime().optional(),
  due_to: z.string().datetime().optional(),
  created_from: z.string().datetime().optional(),
  created_to: z.string().datetime().optional(),
  updated_from: z.string().datetime().optional(),
  updated_to: z.string().datetime().optional(),
});

const getProjectCollaboratorsSchema = z.object({
  page: z.union([z.string(), z.number()]).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  sort: z.string().max(64).optional(),
  role: z.string().max(120).optional(),
  search: z.string().max(80).optional(),
  added_from: z.string().datetime().optional(),
  added_to: z.string().datetime().optional(),
});

const setMyViewPrefSchema = z.object({
  view: z.enum(["board", "list"], {
    required_error: "view must be board or list",
  }),
});

const projectIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID").optional(),
  projectId: z.string().uuid("projectId must be a valid UUID").optional(),
});

module.exports = {
  getProjectsSchema,
  getProjectByIdSchema,
  getProjectStagesSchema,
  getProjectNotesSchema,
  getProjectCollaboratorsSchema,
  setMyViewPrefSchema,
  projectIdParamSchema,
};
