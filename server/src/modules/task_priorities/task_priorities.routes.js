const { Router } = require("express");
const TaskPrioritiesController = require("@/modules/task_priorities/controllers/task-priorities.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const { requireOrgPermission } = require("@/middlewares/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");

const router = Router({ mergeParams: true });

const requireManageTaskPriorities = requireOrgPermission(
  ORG_PERMISSIONS.MANAGE_TASK_PRIORITIES
);

router.use(verifyToken);

router.post(
  "/:project_id/create-priority",
  requireManageTaskPriorities,
  TaskPrioritiesController.createPriority.bind(TaskPrioritiesController)
);
router.get(
  "/:project_id/task-priorities",
  TaskPrioritiesController.getPriorities.bind(TaskPrioritiesController)
);
router.patch(
  "/:project_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  TaskPrioritiesController.updatePriority.bind(TaskPrioritiesController)
);
router.delete(
  "/:project_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  TaskPrioritiesController.deletePriority.bind(TaskPrioritiesController)
);

// Backward compatibility during migration from org-scoped priorities to project-scoped priorities.
router.post(
  "/:org_id/task-priorities",
  requireManageTaskPriorities,
  TaskPrioritiesController.createPriority.bind(TaskPrioritiesController)
);
router.get(
  "/:org_id/task-priorities",
  TaskPrioritiesController.getPriorities.bind(TaskPrioritiesController)
);
router.patch(
  "/:org_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  TaskPrioritiesController.updatePriority.bind(TaskPrioritiesController)
);
router.delete(
  "/:org_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  TaskPrioritiesController.deletePriority.bind(TaskPrioritiesController)
);

module.exports = router;
