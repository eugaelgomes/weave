const express = require("express");
const EngineSprintsController = require("./controllers/engine-sprints.controller");
const EngineReasoningsController = require("./controllers/engine-reasonings.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const {
  requireProjectPermission,
  PROJECT_PERMISSIONS,
} = require("@/middlewares/auth/require-project-permission");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");
const {
  validateGetSprints,
  validateGetReasonings,
  validateEngineContextParam,
  validateReasoningParams,
} = require("./engine.validators");
const {
  resolveProjectPublicIdParam,
} = require("@/middlewares/public-id-resolver");

const router = express.Router();

router.param("projectId", resolveProjectPublicIdParam);

router.use(verifyToken);

router.use((req, res, next) => {
  if (req.method === "GET") {
    return requireScope("projects:read")(req, res, next);
  }
  return requireScope("projects:write")(req, res, next);
});

// ══════════════════════════════════════════════════════════════════════
// Sprints
// ══════════════════════════════════════════════════════════════════════

router.get(
  "/:projectId/sprints/active",
  highTrafficLimiter,
  validateEngineContextParam,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  EngineSprintsController.getActiveSprint.bind(EngineSprintsController)
);

router.get(
  "/:projectId/sprints",
  highTrafficLimiter,
  validateGetSprints,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  EngineSprintsController.getProjectSprints.bind(EngineSprintsController)
);

router.post(
  "/:projectId/sprints",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  EngineSprintsController.createSprint.bind(EngineSprintsController)
);

router.patch(
  "/:projectId/sprints/:sprintId/complete",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  EngineSprintsController.completeSprint.bind(EngineSprintsController)
);

// ══════════════════════════════════════════════════════════════════════
// AI Report Config
// ══════════════════════════════════════════════════════════════════════

router.get(
  "/:projectId/ai-report-config",
  highTrafficLimiter,
  validateEngineContextParam,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  EngineReasoningsController.getAiReportConfig.bind(EngineReasoningsController)
);

router.put(
  "/:projectId/ai-report-config",
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  EngineReasoningsController.updateAiReportConfig.bind(EngineReasoningsController)
);

// ══════════════════════════════════════════════════════════════════════
// Reasonings
// ══════════════════════════════════════════════════════════════════════

router.get(
  "/:projectId/reasonings",
  highTrafficLimiter,
  validateGetReasonings,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  EngineReasoningsController.getReasonings.bind(EngineReasoningsController)
);

router.get(
  "/:projectId/reasonings/:reasoningId",
  highTrafficLimiter,
  validateReasoningParams,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  EngineReasoningsController.getReasoningById.bind(EngineReasoningsController)
);

router.get(
  "/:projectId/reasonings/:reasoningId/action-items",
  highTrafficLimiter,
  validateReasoningParams,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  EngineReasoningsController.getReasoningActionItems.bind(EngineReasoningsController)
);

router.post(
  "/:projectId/reasonings/trigger",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  EngineReasoningsController.triggerReasoningGeneration.bind(EngineReasoningsController)
);

router.post(
  "/:projectId/reasonings",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  EngineReasoningsController.createReasoning.bind(EngineReasoningsController)
);

router.patch(
  "/:projectId/reasonings/:reasoningId/interaction",
  standardTrafficLimiter,
  EngineReasoningsController.updateReasoningInteraction.bind(EngineReasoningsController)
);

router.patch(
  "/:projectId/reasonings/:reasoningId/action-items/:itemId",
  standardTrafficLimiter,
  EngineReasoningsController.updateReasoningActionItem.bind(EngineReasoningsController)
);

module.exports = router;
