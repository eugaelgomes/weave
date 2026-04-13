const { Router } = require("express");
const taskPrioritiesController = require("./task_priorities.controller");
const { verifyToken } = require("@/middlewares/verify-token");

const router = Router({ mergeParams: true });

router.use(verifyToken);

router.post(
  "/:project_id/create-priority",
  taskPrioritiesController.createPriority
);
router.get(
  "/:project_id/task-priorities",
  taskPrioritiesController.getPriorities
);
router.patch(
  "/:project_id/task-priorities/:priority_id",
  taskPrioritiesController.updatePriority
);
router.delete(
  "/:project_id/task-priorities/:priority_id",
  taskPrioritiesController.deletePriority
);

// Backward compatibility during migration from org-scoped priorities to project-scoped priorities.
router.post(
  "/:org_id/task-priorities",
  taskPrioritiesController.createPriority
);
router.get("/:org_id/task-priorities", taskPrioritiesController.getPriorities);
router.patch(
  "/:org_id/task-priorities/:priority_id",
  taskPrioritiesController.updatePriority
);
router.delete(
  "/:org_id/task-priorities/:priority_id",
  taskPrioritiesController.deletePriority
);

module.exports = router;
