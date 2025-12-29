const express = require("express");
const projectsController = require("@/controllers/projects");
const { verifyToken } = require("@/middlewares/authentication");

const router = express.Router();

router.use(verifyToken);

// Todos os projetos
router.get("/", projectsController.getAllProjects.bind(projectsController));

// Criar um novo projeto
router.post("/", projectsController.createProject.bind(projectsController));

// Consultar um projeto ID
router.get("/:id", projectsController.getProjectById.bind(projectsController));

// Atualizar um projeto ID
router.put("/:id", projectsController.updateProject.bind(projectsController));

// Deletar um projeto pelo ID
router.delete(
  "/:id",
  projectsController.deleteProject.bind(projectsController)
);

// Gerenciar colaboradores e notas associadas a um projeto
router
  .route("/:projectId/collaborators")
  .get(projectsController.getCollaborators.bind(projectsController))
  .put(projectsController.manageCollaborators.bind(projectsController));
router
  .route("/:projectId/notes")
  .get(projectsController.getAssociatedNotes.bind(projectsController))
  .put(projectsController.manageNotes.bind(projectsController));

module.exports = router;
