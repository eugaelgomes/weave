const express = require("express");
const ProjectsReadController = require("@/modules/projects/controllers/projects-read.controller");
const ProjectsCreateController = require("@/modules/projects/controllers/projects-create.controller");
const ProjectsUpdateController = require("@/modules/projects/controllers/projects-update.controller");
const ProjectsDeleteController = require("@/modules/projects/controllers/projects-delete.controller");
const UserViewPrefsController = require("@/modules/projects/controllers/user-view-prefs.controller");
const ProjectsCollaboratorsCreateController = require("@/modules/projects/controllers/projects-collaborators-create.controller");
const ProjectsCollaboratorsUpdateController = require("@/modules/projects/controllers/projects-collaborators-update.controller");
const TagsController = require("@/modules/projects/controllers/tags.controller");
const TaskPrioritiesController = require("@/modules/projects/controllers/task-priorities.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { validate } = require("@/middlewares/validation/validate");
const { requireScope } = require("@/middlewares/auth/require-scope");
const {
  requireProjectPermission,
  PROJECT_PERMISSIONS,
} = require("@/middlewares/auth/require-project-permission");
const { requireOrgPermission } = require("@/middlewares/auth/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");
const { projectUpdateUpload } = require("@/modules/projects/utils/project-upload.util");
const { noteUpdateUpload } = require("@/modules/notes/utils/note-upload.util");
const {
  highTrafficLimiter,
  standardTrafficLimiter,
} = require("@/middlewares/security/request-limiters");
const {
  validateGetProjects,
  validateGetProjectById,
  validateGetProjectStages,
  validateGetProjectNotes,
  validateGetProjectCollaborators,
  validateGetMyViewPref,
  validateSetMyViewPref,
} = require("@/modules/projects/projects.validators");
const { tagsParamsSchema, createTagSchema, updateTagSchema } = require("./schemas/tags.schema");
const {
  taskPrioritiesParamsSchema,
  createTaskPrioritySchema,
  updateTaskPrioritySchema,
} = require("./schemas/task-priorities.schema");
const {
  resolveProjectPublicIdParam,
  resolveNotePublicIdParam,
} = require("@/middlewares/public-id-resolver");

const router = express.Router();

const requireManageTags = requireOrgPermission(ORG_PERMISSIONS.MANAGE_TAGS);
const requireManageTaskPriorities = requireOrgPermission(ORG_PERMISSIONS.MANAGE_TASK_PRIORITIES);

router.param("id", resolveProjectPublicIdParam);
router.param("projectId", resolveProjectPublicIdParam);
router.param("noteId", resolveNotePublicIdParam);

router.use(verifyToken);
const { requireModule } = require("@/middlewares/auth/require-module");
router.use(requireModule("projects"));
router.use((req, res, next) => {
  if (req.method === "GET") {
    return requireScope("projects:read")(req, res, next);
  }
  return requireScope("projects:write")(req, res, next);
});

router.get(
  "/",
  highTrafficLimiter,
  validateGetProjects,
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
  "/:id/my-view-preference",
  highTrafficLimiter,
  validateGetMyViewPref,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  UserViewPrefsController.getMyView.bind(UserViewPrefsController)
);
router.put(
  "/:id/my-view-preference",
  standardTrafficLimiter,
  validateSetMyViewPref,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  UserViewPrefsController.setMyView.bind(UserViewPrefsController)
);

router.get(
  "/:id",
  highTrafficLimiter,
  validateGetProjectById,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
  ProjectsReadController.getProjectById.bind(ProjectsReadController)
);

router.get(
  "/:id/stages",
  highTrafficLimiter,
  validateGetProjectStages,
  requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
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
  .get(
    highTrafficLimiter,
    validateGetProjectCollaborators,
    requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
    ProjectsReadController.getCollaborators.bind(ProjectsReadController)
  )
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
  .get(
    highTrafficLimiter,
    validateGetProjectNotes,
    requireProjectPermission(PROJECT_PERMISSIONS.READ_PROJECT_CONTENT),
    ProjectsReadController.getAssociatedNotes.bind(ProjectsReadController)
  )
  .put(
    requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
    ProjectsUpdateController.manageNotes.bind(ProjectsUpdateController)
  );

router.put(
  "/:projectId/notes/:noteId/stage",
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  ProjectsUpdateController.updateNoteStage.bind(ProjectsUpdateController)
);

router.post(
  "/:projectId/stages/:stageId/tasks",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  noteUpdateUpload.fields([{ maxCount: 10, name: "files" }]),
  ProjectsUpdateController.createTaskInStage.bind(ProjectsUpdateController)
);

router.patch(
  "/:projectId/tasks/:noteId",
  standardTrafficLimiter,
  requireProjectPermission(PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT),
  noteUpdateUpload.fields([{ maxCount: 10, name: "files" }]),
  ProjectsUpdateController.patchTaskInProject.bind(ProjectsUpdateController)
);

// --- TAGS ---
router.post(
  "/:projectId/tags",
  requireManageTags,
  validate(tagsParamsSchema, "params"),
  validate(createTagSchema, "body"),
  TagsController.createTag.bind(TagsController)
);
router.get(
  "/:projectId/tags",
  validate(tagsParamsSchema, "params"),
  TagsController.getTags.bind(TagsController)
);
router.patch(
  "/:projectId/tags/:tag_id",
  requireManageTags,
  validate(tagsParamsSchema, "params"),
  validate(updateTagSchema, "body"),
  TagsController.updateTag.bind(TagsController)
);
router.delete(
  "/:projectId/tags/:tag_id",
  requireManageTags,
  validate(tagsParamsSchema, "params"),
  TagsController.deleteTag.bind(TagsController)
);

// --- TASK PRIORITIES ---
router.post(
  "/:projectId/create-priority",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  validate(createTaskPrioritySchema, "body"),
  TaskPrioritiesController.createPriority.bind(TaskPrioritiesController)
);
router.get(
  "/:projectId/task-priorities",
  validate(taskPrioritiesParamsSchema, "params"),
  TaskPrioritiesController.getPriorities.bind(TaskPrioritiesController)
);
router.patch(
  "/:projectId/task-priorities/:priority_id",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  validate(updateTaskPrioritySchema, "body"),
  TaskPrioritiesController.updatePriority.bind(TaskPrioritiesController)
);
router.delete(
  "/:projectId/task-priorities/:priority_id",
  requireManageTaskPriorities,
  validate(taskPrioritiesParamsSchema, "params"),
  TaskPrioritiesController.deletePriority.bind(TaskPrioritiesController)
);

module.exports = router;
