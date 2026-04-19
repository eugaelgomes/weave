const express = require("express");
const ProjectsReadController = require("@/modules/projects/controllers/projects-read.controller");
const ProjectsCreateController = require("@/modules/projects/controllers/projects-create.controller");
const ProjectsUpdateController = require("@/modules/projects/controllers/projects-update.controller");
const ProjectsDeleteController = require("@/modules/projects/controllers/projects-delete.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireOrgPermission } = require("@/middlewares/auth/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");
const { projectUpdateUpload } = require("@/utils/data/project-upload");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

const router = express.Router();

const requireManageProjects = requireOrgPermission(ORG_PERMISSIONS.MANAGE_PROJECTS);

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
  requireManageProjects,
  ProjectsCreateController.createProject.bind(ProjectsCreateController)
);
router.patch(
  "/:projectId",
  standardTrafficLimiter,
  requireManageProjects,
  ProjectsUpdateController.updateProject.bind(ProjectsUpdateController)
);
router.delete(
  "/:projectId",
  standardTrafficLimiter,
  requireManageProjects,
  ProjectsDeleteController.deleteProject.bind(ProjectsDeleteController)
);

router.get(
  "/:id",
  ProjectsReadController.getProjectById.bind(ProjectsReadController)
);

router.put(
  "/:id",
  requireManageProjects,
  projectUpdateUpload.fields([
    { maxCount: 1, name: "icon" },
    { maxCount: 10, name: "files" },
  ]),
  ProjectsUpdateController.updateProject.bind(ProjectsUpdateController)
);

router.delete(
  "/:id",
  requireManageProjects,
  ProjectsDeleteController.deleteProject.bind(ProjectsDeleteController)
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
  requireManageProjects,
  ProjectsUpdateController.updateProjectStage.bind(ProjectsUpdateController)
);
router.delete(
  "/:id/stages/:stageId",
  standardTrafficLimiter,
  requireManageProjects,
  ProjectsDeleteController.deleteProjectStage.bind(ProjectsDeleteController)
);

router
  .route("/:projectId/collaborators")
  .get(ProjectsReadController.getCollaborators.bind(ProjectsReadController))
  .put(
    requireManageProjects,
    ProjectsUpdateController.manageCollaborators.bind(ProjectsUpdateController)
  );

router
  .route("/:projectId/notes")
  .get(ProjectsReadController.getAssociatedNotes.bind(ProjectsReadController))
  .put(
    requireManageProjects,
    ProjectsUpdateController.manageNotes.bind(ProjectsUpdateController)
  );

router.put(
  "/:projectId/notes/:noteId/stage",
  requireManageProjects,
  ProjectsUpdateController.updateNoteStage.bind(ProjectsUpdateController)
);

module.exports = router;
