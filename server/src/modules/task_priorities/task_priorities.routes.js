const { Router } = require("express");
const taskPrioritiesController = require("./task_priorities.controller");
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
  taskPrioritiesController.createPriority
);
router.get(
  "/:project_id/task-priorities",
  taskPrioritiesController.getPriorities
);
router.patch(
  "/:project_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  taskPrioritiesController.updatePriority
);
router.delete(
  "/:project_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  taskPrioritiesController.deletePriority
);

// Backward compatibility during migration from org-scoped priorities to project-scoped priorities.
router.post(
  "/:org_id/task-priorities",
  requireManageTaskPriorities,
  taskPrioritiesController.createPriority
);
router.get("/:org_id/task-priorities", taskPrioritiesController.getPriorities);
router.patch(
  "/:org_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  taskPrioritiesController.updatePriority
);
router.delete(
  "/:org_id/task-priorities/:priority_id",
  requireManageTaskPriorities,
  taskPrioritiesController.deletePriority
);

module.exports = router;
