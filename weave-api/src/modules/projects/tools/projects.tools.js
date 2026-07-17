const { z } = require("zod");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsCreateRepository = require("@/modules/projects/repositories/projects-create.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const projectsDeleteRepository = require("@/modules/projects/repositories/projects-delete.repository");
const createNotesRepository = require("@/modules/notes/repositories/create-notes.repository");
const mutateNotesRepository = require("@/modules/notes/repositories/mutate-notes.repository");

// Input schemas for the LLM
const listProjectsSchema = z.object({});

const getProjectSchema = z.object({
  projectId: z.string().uuid(),
});

const createProjectSchema = z.object({
  description: z.string().optional(),
  name: z.string(),
});

const updateProjectSchema = z.object({
  description: z.string().optional(),
  name: z.string().optional(),
  projectId: z.string().uuid(),
});

const deleteProjectSchema = z.object({
  projectId: z.string().uuid(),
});

const getProjectStatsSchema = z.object({});

const listProjectStagesSchema = z.object({
  projectId: z.string().uuid(),
});

const updateProjectStageSchema = z.object({
  name: z.string().optional(),
  order: z.number().optional(),
  projectId: z.string().uuid(),
  stageId: z.string().uuid(),
});

const deleteProjectStageSchema = z.object({
  projectId: z.string().uuid(),
  stageId: z.string().uuid(),
});

const getProjectNotesSchema = z.object({
  projectId: z.string().uuid(),
});

const updateNoteStageSchema = z.object({
  noteId: z.string().uuid(),
  projectId: z.string().uuid(),
  stageId: z.string().uuid().nullable(),
});

const createTaskInStageSchema = z.object({
  content: z.string().optional(),
  projectId: z.string().uuid(),
  stageId: z.string().uuid(),
  title: z.string(),
});

/**
 * Creates the Projects tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The projects tools definition map.
 */
const createProjectsTools = (user) => ({
  create_project: {
    description: "Create a new project",
    handler: async (args) => {
      try {
        const result = await projectsCreateRepository.createProjectWithStages(
          {
            description: args.description,
            organization_id: user.organizationId,
            title: args.name,
            user_id: user.userId,
          },
          []
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "create_project",
    schema: createProjectSchema,
  },
  create_task_in_stage: {
    description: "Create a new task directly in a specific project stage",
    handler: async (args) => {
      try {
        const { projectId, stageId, title, content } = args;
        const result = await createNotesRepository.createNote(user.userId, {
          description: content,
          project_id: projectId,
          project_stage_id: stageId,
          title,
        });
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "create_task_in_stage",
    schema: createTaskInStageSchema,
  },
  delete_project: {
    description: "Delete a project",
    handler: async (args) => {
      try {
        await projectsDeleteRepository.deleteProject(
          args.projectId,
          user.userId
        );
        return {
          content: [
            { text: JSON.stringify({ success: true }, null, 2), type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "delete_project",
    schema: deleteProjectSchema,
  },
  delete_project_stage: {
    description: "Delete a project stage",
    handler: async (args) => {
      try {
        await projectsDeleteRepository.deleteProjectStage(
          args.projectId,
          user.userId,
          args.stageId
        );
        return {
          content: [
            { text: JSON.stringify({ success: true }, null, 2), type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "delete_project_stage",
    schema: deleteProjectStageSchema,
  },
  get_project: {
    description: "Get details for a specific project",
    handler: async (args) => {
      try {
        const result = await projectsReadRepository.getProjectById(
          args.projectId,
          user.userId
        );
        if (!result) {
          return {
            content: [
              { text: "Project not found or access denied.", type: "text" },
            ],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "get_project",
    schema: getProjectSchema,
  },
  get_project_notes: {
    description: "Get all notes (tasks) in a project",
    handler: async (args) => {
      try {
        const result = await projectsReadRepository.getAssociatedNotes(
          args.projectId,
          user.userId
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "get_project_notes",
    schema: getProjectNotesSchema,
  },
  get_project_stats: {
    description: "Get statistics across all projects",
    handler: async () => {
      try {
        const result = await projectsReadRepository.getProjectStats(
          user.userId
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "get_project_stats",
    schema: getProjectStatsSchema,
  },
  list_project_stages: {
    description: "List stages for a project's board",
    handler: async (args) => {
      try {
        const result = await projectsReadRepository.getProjectStages(
          args.projectId
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "list_project_stages",
    schema: listProjectStagesSchema,
  },
  list_projects: {
    description: "List all projects in the workspace",
    handler: async () => {
      try {
        const result = await projectsReadRepository.getAllProjects(user.userId);
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "list_projects",
    schema: listProjectsSchema,
  },
  update_note_stage: {
    description: "Move a note (task) to a different stage in a project board",
    handler: async (args) => {
      try {
        const { noteId, stageId } = args;
        // The mutateNotesRepository usually has something like moveNoteToStage or just updateNote
        const result = await mutateNotesRepository.updateNote(
          noteId,
          user.userId,
          { project_stage_id: stageId }
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "update_note_stage",
    schema: updateNoteStageSchema,
  },
  update_project: {
    description: "Update an existing project",
    handler: async (args) => {
      try {
        const { projectId, name, description } = args;
        const updates = {};
        if (name !== undefined) updates.title = name;
        if (description !== undefined) updates.description = description;

        const result = await projectsUpdateRepository.updateProject(
          projectId,
          user.userId,
          updates
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "update_project",
    schema: updateProjectSchema,
  },
  update_project_stage: {
    description: "Update a project stage",
    handler: async (args) => {
      try {
        const { projectId, stageId, name, order } = args;
        const updates = {};
        if (name !== undefined) updates.title = name;
        if (order !== undefined) updates.position = order;

        const result = await projectsUpdateRepository.updateProjectStage(
          projectId,
          user.userId,
          stageId,
          updates
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "update_project_stage",
    schema: updateProjectStageSchema,
  },
});

module.exports = {
  createProjectsTools,
};
