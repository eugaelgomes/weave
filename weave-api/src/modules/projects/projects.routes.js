const express = require("express");
const ProjectsReadController = require("@/modules/projects/controllers/projects-read.controller");
const ProjectsCreateController = require("@/modules/projects/controllers/projects-create.controller");
const ProjectsUpdateController = require("@/modules/projects/controllers/projects-update.controller");
const ProjectsDeleteController = require("@/modules/projects/controllers/projects-delete.controller");
const ProjectsCollaboratorsCreateController = require("@/modules/projects/controllers/projects-collaborators-create.controller");
const ProjectsCollaboratorsUpdateController = require("@/modules/projects/controllers/projects-collaborators-update.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  requireProjectPermission,
  PROJECT_PERMISSIONS,
} = require("@/middlewares/auth/require-project-permission");
const { projectUpdateUpload } = require("@/utils/data/project-upload");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

const router = express.Router();

router.use(verifyToken);

router.get(
  "/",
  highTrafficLimiter,
  ProjectsReadController.getAllProjects.bind(ProjectsReadController)
);
router.get(
  "/stats",
  highTrafficLimiter,
  ProjectsReadController.getProjectStats.bind(ProjectsReadController)
);

router.post(
  "/",
  standardTrafficLimiter,
  ProjectsCreateController.createProject.bind(ProjectsCreateController)
);
router.patch(
  "/:id",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  ProjectsUpdateController.updateProject.bind(ProjectsUpdateController)
);
router.delete(
  "/:id",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  ProjectsDeleteController.deleteProject.bind(ProjectsDeleteController)
);

router.put(
  "/:id",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  projectUpdateUpload.fields([
    { maxCount: 1, name: "icon" },
    { maxCount: 10, name: "files" },
  ]),
  ProjectsUpdateController.updateProject.bind(ProjectsUpdateController)
);

router.get(
  "/:id",
  ProjectsReadController.getProjectById.bind(ProjectsReadController)
);

router.get(
  "/:id/stages",
  ProjectsReadController.getProjectStages.bind(ProjectsReadController)
);

router.patch(
  "/:id/stages/:stageId",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  ProjectsUpdateController.updateProjectStage.bind(ProjectsUpdateController)
);
router.delete(
  "/:id/stages/:stageId",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  ProjectsDeleteController.deleteProjectStage.bind(ProjectsDeleteController)
);

router
  .route("/:projectId/collaborators")
  .get(ProjectsReadController.getCollaborators.bind(ProjectsReadController))
  .post(
    standardTrafficLimiter,
    requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_MEMBERS),
    ProjectsCollaboratorsCreateController.addCollaborator.bind(
      ProjectsCollaboratorsCreateController
    )
  );

router.patch(
  "/:projectId/collaborators/:collaboratorId",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_MEMBERS),
  ProjectsCollaboratorsUpdateController.updateCollaboratorPermission.bind(
    ProjectsCollaboratorsUpdateController
  )
);

router.put(
  "/:projectId/collaborators/:collaboratorId",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_MEMBERS),
  ProjectsCollaboratorsUpdateController.updateCollaboratorPermission.bind(
    ProjectsCollaboratorsUpdateController
  )
);

router
  .route("/:projectId/notes")
  .get(ProjectsReadController.getAssociatedNotes.bind(ProjectsReadController))
  .put(
    requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
    ProjectsUpdateController.manageNotes.bind(ProjectsUpdateController)
  );

router.put(
  "/:projectId/notes/:noteId/stage",
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  ProjectsUpdateController.updateNoteStage.bind(ProjectsUpdateController)
);

// AI Report Config
router.get(
  "/:id/ai-report-config",
  ProjectsReadController.getAiReportConfig.bind(ProjectsReadController)
);
router.put(
  "/:id/ai-report-config",
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  ProjectsUpdateController.updateAiReportConfig.bind(ProjectsUpdateController)
);

// Sprints
router.get(
  "/:id/sprints",
  ProjectsReadController.getProjectSprints.bind(ProjectsReadController)
);
router.get(
  "/:id/sprints/active",
  ProjectsReadController.getActiveSprint.bind(ProjectsReadController)
);
router.post(
  "/:id/sprints",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  ProjectsUpdateController.createSprint.bind(ProjectsUpdateController)
);
router.patch(
  "/:id/sprints/:sprintId/complete",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  ProjectsUpdateController.completeSprint.bind(ProjectsUpdateController)
);

// Reasonings
router.get(
  "/:id/reasonings",
  ProjectsReadController.getReasonings.bind(ProjectsReadController)
);
router.get(
  "/:id/reasonings/:reasoningId",
  ProjectsReadController.getReasoningById.bind(ProjectsReadController)
);
router.get(
  "/:id/reasonings/:reasoningId/action-items",
  ProjectsReadController.getReasoningActionItems.bind(ProjectsReadController)
);
router.post(
  "/:id/reasonings",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.MANAGE_PROJECT_LIFECYCLE),
  ProjectsUpdateController.createReasoning.bind(ProjectsUpdateController)
);
router.patch(
  "/:id/reasonings/:reasoningId/interaction",
  standardTrafficLimiter,
  ProjectsUpdateController.updateReasoningInteraction.bind(
    ProjectsUpdateController
  )
);
router.patch(
  "/:id/reasonings/:reasoningId/action-items/:itemId",
  standardTrafficLimiter,
  ProjectsUpdateController.updateReasoningActionItem.bind(
    ProjectsUpdateController
  )
);

module.exports = router;

