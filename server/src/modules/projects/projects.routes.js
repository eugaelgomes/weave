const express = require("express");
const projectsController = require("@/modules/projects/projects.controller");
const { verifyToken } = require("@/middlewares/authentication");
const { projectUpdateUpload } = require("@/middlewares/data/project-upload");

const router = express.Router();

router.use(verifyToken);

router.get("/", projectsController.getAllProjects.bind(projectsController));

router.post("/", projectsController.createProject.bind(projectsController));

router.get("/:id", projectsController.getProjectById.bind(projectsController));

router.put(
  "/:id",
  projectUpdateUpload.fields([
    { name: "icon", maxCount: 1 },
    { name: "files", maxCount: 10 },
  ]),
  projectsController.updateProject.bind(projectsController)
);

router.delete(
  "/:id",
  projectsController.deleteProject.bind(projectsController)
);

router.get("/:id", projectsController.getProjectById.bind(projectsController));

router.get("/:id/stages", projectsController.getProjectStages.bind(projectsController));

router
  .route("/:projectId/collaborators")
  .get(projectsController.getCollaborators.bind(projectsController))
  .put(projectsController.manageCollaborators.bind(projectsController));

router
  .route("/:projectId/notes")
  .get(projectsController.getAssociatedNotes.bind(projectsController))
  .put(projectsController.manageNotes.bind(projectsController));

module.exports = router;
