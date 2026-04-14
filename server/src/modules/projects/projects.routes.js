const express = require("express");
const projectsController = require("@/modules/projects/projects.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const { requireOrgPermission } = require("@/middlewares/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");
const { projectUpdateUpload } = require("@/utils/data/project-upload");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/request-limiters");

const router = express.Router();

const requireManageProjects = requireOrgPermission(ORG_PERMISSIONS.MANAGE_PROJECTS);

router.use(verifyToken);

// Leitura de projetos (Alto fluxo)
router.get(
  "/",
  highTrafficLimiter,
  projectsController.getAllProjects.bind(projectsController)
);
router.get(
  "/stats",
  highTrafficLimiter,
  projectsController.getProjectStats.bind(projectsController)
);

// Modificações (Fluxo moderado)
router.post(
  "/",
  standardTrafficLimiter,
  requireManageProjects,
  projectsController.createProject.bind(projectsController)
);
router.patch(
  "/:projectId",
  standardTrafficLimiter,
  requireManageProjects,
  projectsController.updateProject.bind(projectsController)
);
router.delete(
  "/:projectId",
  standardTrafficLimiter,
  requireManageProjects,
  projectsController.deleteProject.bind(projectsController)
);

router.get("/:id", projectsController.getProjectById.bind(projectsController));

router.put(
  "/:id",
  requireManageProjects,
  projectUpdateUpload.fields([
    { maxCount: 1, name: "icon" },
    { maxCount: 10, name: "files" },
  ]),
  projectsController.updateProject.bind(projectsController)
);

router.delete(
  "/:id",
  requireManageProjects,
  projectsController.deleteProject.bind(projectsController)
);

router.get("/:id", projectsController.getProjectById.bind(projectsController));

router.get(
  "/:id/stages",
  projectsController.getProjectStages.bind(projectsController)
);

router
  .route("/:projectId/collaborators")
  .get(projectsController.getCollaborators.bind(projectsController))
  .put(
    requireManageProjects,
    projectsController.manageCollaborators.bind(projectsController)
  );

router
  .route("/:projectId/notes")
  .get(projectsController.getAssociatedNotes.bind(projectsController))
  .put(
    requireManageProjects,
    projectsController.manageNotes.bind(projectsController)
  );

router.put(
  "/:projectId/notes/:noteId/stage",
  requireManageProjects,
  projectsController.updateNoteStage.bind(projectsController)
);

module.exports = router;
