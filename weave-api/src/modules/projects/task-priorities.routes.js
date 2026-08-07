const { Router } = require("express");
const TaskPrioritiesController = require("@/modules/projects/controllers/task-priorities.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const {
  requireOrgPermission,
} = require("@/middlewares/auth/require-org-permission");
const {
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");

const {
  resolveProjectPublicIdParam,
  resolveOrganizationPublicIdParam,
} = require("@/middlewares/public-id-resolver");
const { validate } = require("@/middlewares/validation/validate");
const {
  taskPrioritiesParamsSchema,
  createTaskPrioritySchema,
  updateTaskPrioritySchema,
} = require("./schemas/task-priorities.schema");

const router = Router({ mergeParams: true });

router.param("project_id", resolveProjectPublicIdParam);
router.param("org_id", resolveOrganizationPublicIdParam);

const requireManageTaskPriorities = requireOrgPermission(
  ORG_PERMISSIONS.MANAGE_TASK_PRIORITIES
);

router.use(verifyToken);

router.use((req, res, next) => {
  if (req.method === "GET") {
    return requireScope("priorities:read")(req, res, next);
  }
  return requireScope("priorities:write")(req, res, next);
});

router.post(
  "/:project_id/create-priority",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  validate(createTaskPrioritySchema, "body"),
  TaskPrioritiesController.createPriority.bind(TaskPrioritiesController)
);
router.get(
  "/:project_id/task-priorities",
  validate(taskPrioritiesParamsSchema, "params"),
  TaskPrioritiesController.getPriorities.bind(TaskPrioritiesController)
);
router.patch(
  "/:project_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  validate(updateTaskPrioritySchema, "body"),
  TaskPrioritiesController.updatePriority.bind(TaskPrioritiesController)
);
router.delete(
  "/:project_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  TaskPrioritiesController.deletePriority.bind(TaskPrioritiesController)
);

// Backward compatibility during migration from org-scoped priorities to project-scoped priorities.
router.post(
  "/:org_id/task-priorities",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  validate(createTaskPrioritySchema, "body"),
  TaskPrioritiesController.createPriority.bind(TaskPrioritiesController)
);
router.get(
  "/:org_id/task-priorities",
  validate(taskPrioritiesParamsSchema, "params"),
  TaskPrioritiesController.getPriorities.bind(TaskPrioritiesController)
);
router.patch(
  "/:org_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  validate(updateTaskPrioritySchema, "body"),
  TaskPrioritiesController.updatePriority.bind(TaskPrioritiesController)
);
router.delete(
  "/:org_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  TaskPrioritiesController.deletePriority.bind(TaskPrioritiesController)
);

module.exports = router;
