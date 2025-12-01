const express = require("express");

const projectsController = require("@/controllers/projects/projects-controller");

const { verifyToken } = require("@/middlewares/auth/auth-middleware");

const router = express.Router();

// --- AUTH MIDDLEWARE ---
router.use(verifyToken);

// --- ROUTES FOR PROJECT MANAGEMENT ---

// GET /api/projects - Get all projects with complete data
router.get("/", projectsController.getAllProjects.bind(projectsController));

// POST /api/projects - Create a new project
router.post("/", projectsController.createProject.bind(projectsController));

// GET /api/projects/:id - Get a specific project
router.get("/:id", projectsController.getProjectById.bind(projectsController));

// PUT /api/projects/:id - Update project
router.put("/:id", projectsController.updateProject.bind(projectsController));

// PATCH /api/projects/:id/properties - Update properties
router.patch("/:id/properties", projectsController.updateProjectProperties.bind(projectsController));

// DELETE /api/projects/:id - Delete project
router.delete("/:id", projectsController.deleteProject.bind(projectsController));

// --- ROUTES FOR COLLABORATORS ---

router.route("/:projectId/collaborators")
  .get(projectsController.getCollaborators.bind(projectsController))
  .post(projectsController.addCollaborator.bind(projectsController));

router.route("/:projectId/collaborators/:collaboratorId")
  .patch(projectsController.updateCollaboratorPermission.bind(projectsController))
  .delete(projectsController.removeCollaborator.bind(projectsController));

// --- ROUTES FOR NOTES ---

router.route("/:projectId/notes")
  .get(projectsController.getAssociatedNotes.bind(projectsController))
  .post(projectsController.addNoteToProject.bind(projectsController));

router.route("/:projectId/notes/:noteId")
  .put(projectsController.updateNoteInProject.bind(projectsController))
  .delete(projectsController.removeNoteFromProject.bind(projectsController));

module.exports = router;
