const { z } = require("zod");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsCreateRepository = require("@/modules/projects/repositories/projects-create.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const projectsDeleteRepository = require("@/modules/projects/repositories/projects-delete.repository");
const McpLinksUtil = require("@/utils/mcp-links.util");
const createNotesRepository = require("@/modules/notes/repositories/create-notes.repository");
const mutateNotesRepository = require("@/modules/notes/repositories/mutate-notes.repository");
const spacesService = require("@/services/storage/index");

const manageProjectsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    description: z.string().optional().describe("Description of the project"),
    methodology: z
      .enum(["KANBAN", "SCRUM"])
      .optional()
      .describe("Project methodology"),
    name: z.string().describe("Name of the project"),
  }),
  z.object({
    action: z.literal("update"),
    description: z.string().optional().describe("Description of the project"),
    name: z.string().optional().describe("Name of the project"),
    projectId: z.string().uuid().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("delete"),
    projectId: z.string().uuid().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("get"),
    projectId: z.string().uuid().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("list"),
  }),
  z.object({
    action: z.literal("stats"),
  }),
  z.object({
    action: z.literal("upload_file"),
    base64Data: z.string().describe("Base64 encoded string of the file content"),
    fileName: z.string().optional().describe("Original file name"),
    mimeType: z.string().describe("MIME type of the file (e.g., image/png, application/pdf)"),
    projectId: z.string().uuid().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("read_file"),
    url: z.string().describe("The public URL of the file to read/download"),
  }),
  z.object({
    action: z.literal("delete_file"),
    url: z.string().describe("The public URL of the file to delete"),
  }),
]);

const manageProjectStagesSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    name: z.string().optional().describe("New name for the stage"),
    order: z.number().optional().describe("New order for the stage"),
    projectId: z.string().uuid().describe("ID of the project"),
    stageId: z.string().uuid().describe("ID of the stage"),
  }),
  z.object({
    action: z.literal("delete"),
    projectId: z.string().uuid().describe("ID of the project"),
    stageId: z.string().uuid().describe("ID of the stage"),
  }),
  z.object({
    action: z.literal("list"),
    projectId: z.string().uuid().describe("ID of the project"),
  }),
]);

const manageProjectTasksSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list"),
    projectId: z.string().uuid().describe("ID of the project"),
  }),
  z.object({
    action: z.literal("create"),
    content: z.string().optional().describe("Content of the task"),
    projectId: z.string().uuid().describe("ID of the project"),
    stageId: z.string().uuid().describe("ID of the stage"),
    title: z.string().describe("Title of the task"),
  }),
  z.object({
    action: z.literal("update_stage"),
    noteId: z.string().uuid().describe("ID of the task/note"),
    projectId: z.string().uuid().describe("ID of the project"),
    stageId: z.string().uuid().nullable().describe("ID of the new stage"),
  }),
]);

const createProjectsTools = (user) => ({
  manage_project_stages: {
    description: "Manage project stages/columns (update, delete, list).",
    handler: async (args) => {
      try {
        const { action, projectId, stageId, name, order } = args;

        if (action === "list") {
          const result =
            await projectsReadRepository.getProjectStages(projectId);
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!stageId)
            throw new Error("stageId is required for update action");
          const result = await projectsUpdateRepository.updateProjectStage(
            projectId,
            user.userId,
            stageId,
            { name, order }
          );
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!stageId)
            throw new Error("stageId is required for delete action");
          await projectsDeleteRepository.deleteProjectStage(
            projectId,
            user.userId,
            stageId
          );
          return {
            content: [
              {
                text: JSON.stringify({ success: true }, null, 2),
                type: "text",
              },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "manage_project_stages",
    schema: manageProjectStagesSchema,
  },

  manage_project_tasks: {
    description:
      "Manage tasks/notes inside a project (list, create, update_stage).",
    handler: async (args) => {
      try {
        const { action, projectId, stageId, noteId, title, content } = args;

        if (action === "list") {
          const result = await projectsReadRepository.getAssociatedNotes(
            projectId,
            user.userId
          );
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "create") {
          if (!stageId || !title)
            throw new Error("stageId and title are required for create action");
          const result = await createNotesRepository.createNote(user.userId, {
            description: content,
            project_id: projectId,
            project_stage_id: stageId,
            title,
          });
          const enriched = McpLinksUtil.enrichWithAppUrl(result, "task", "public_note_id");
          return {
            content: [{ text: JSON.stringify(enriched, null, 2), type: "text" }],
          };
        }

        if (action === "update_stage") {
          if (!noteId)
            throw new Error("noteId is required for update_stage action");
          const result = await mutateNotesRepository.updateNoteStage(
            noteId,
            stageId,
            projectId,
            user.userId
          );
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "manage_project_tasks",
    schema: manageProjectTasksSchema,
  },

  manage_projects: {
    description: "Manage projects (create, update, delete, get, list, stats, upload_file, read_file, delete_file).",
    handler: async (args) => {
      try {
        const { action, projectId, name, description, methodology, fileName, mimeType, base64Data, url } = args;

        if (action === "create") {
          if (!name) throw new Error("name is required for create action");
          const result = await projectsCreateRepository.createProjectWithStages(
            {
              description,
              methodology: methodology || "KANBAN",
              organization_id: user.organizationId,
              title: name,
              user_id: user.userId,
            },
            []
          );
          const enriched = McpLinksUtil.enrichWithAppUrl(result, "project", "id");
          return {
            content: [{ text: JSON.stringify(enriched, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!projectId)
            throw new Error("projectId is required for update action");
          const result = await projectsUpdateRepository.updateProject(
            projectId,
            user.userId,
            { description, title: name }
          );
          const enriched = McpLinksUtil.enrichWithAppUrl(result, "project", "id");
          return {
            content: [{ text: JSON.stringify(enriched, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!projectId)
            throw new Error("projectId is required for delete action");
          await projectsDeleteRepository.deleteProject(projectId, user.userId);
          return {
            content: [
              {
                text: JSON.stringify({ success: true }, null, 2),
                type: "text",
              },
            ],
          };
        }

        if (action === "get") {
          if (!projectId)
            throw new Error("projectId is required for get action");
          const result = await projectsReadRepository.getProjectById(
            projectId,
            user.userId
          );
          if (!result) throw new Error("Project not found or access denied.");
          const enriched = McpLinksUtil.enrichWithAppUrl(result, "project", "id");
          return {
            content: [{ text: JSON.stringify(enriched, null, 2), type: "text" }],
          };
        }

        if (action === "list") {
          const result = await projectsReadRepository.getProjectsForUser(
            user.userId
          );
          const enriched = result.map(p => McpLinksUtil.enrichWithAppUrl(p, "project", "id"));
          return {
            content: [{ text: JSON.stringify(enriched, null, 2), type: "text" }],
          };
        }

        if (action === "stats") {
          const result = await projectsReadRepository.getProjectStats(
            user.userId
          );
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "upload_file") {
          if (!projectId) throw new Error("projectId is required for upload_file action");
          const buffer = Buffer.from(base64Data, "base64");
          const result = await spacesService.uploadProjectFile(buffer, mimeType, projectId, user.userId, fileName);
          return {
            content: [
              { text: "File uploaded successfully!\nURL: " + result.url + "\nKey: " + result.key, type: "text" },
            ],
          };
        }

        if (action === "read_file") {
          const key = spacesService.extractKeyFromUrl(url);
          if (!key) throw new Error("Invalid URL or could not extract file key");
          const buffer = await spacesService.downloadFile(key);
          const base64Str = buffer.toString("base64");
          return {
            content: [
              { text: `File successfully read. Extracted ${buffer.length} bytes.`, type: "text" },
              { text: "data:application/octet-stream;base64," + base64Str, type: "text" }
            ],
          };
        }

        if (action === "delete_file") {
          const key = spacesService.extractKeyFromUrl(url);
          if (!key) throw new Error("Invalid URL or could not extract file key");
          const success = await spacesService.deleteImage(key);
          if (!success) throw new Error("Failed to delete file from storage.");
          return {
            content: [
              { text: "File deleted successfully (Key: " + key + ")", type: "text" },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [{ text: `Error: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "manage_projects",
    schema: manageProjectsSchema,
  },
});

module.exports = {
  createProjectsTools,
};
