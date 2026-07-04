import { McpToolDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";
import {
  listProjectsSchema,
  getProjectSchema,
  createProjectSchema,
  updateProjectSchema,
  deleteProjectSchema,
  getProjectStatsSchema,
  listProjectStagesSchema,
  updateProjectStageSchema,
  deleteProjectStageSchema,
  getProjectNotesSchema,
  updateNoteStageSchema,
  createTaskInStageSchema,
} from "../schemas/projects.schema";
import { z } from "zod";

export const projectTools: Record<string, McpToolDefinition<any>> = {
  list_projects: {
    name: "list_projects",
    description: "List all projects in the workspace",
    schema: listProjectsSchema,
    handler: async () => {
      try {
        const response = await weaveApiClient.get("/projects");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_project: {
    name: "get_project",
    description: "Get details for a specific project",
    schema: getProjectSchema,
    handler: async (args: z.infer<typeof getProjectSchema>) => {
      try {
        const response = await weaveApiClient.get(`/projects/${args.projectId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  create_project: {
    name: "create_project",
    description: "Create a new project",
    schema: createProjectSchema,
    handler: async (args: z.infer<typeof createProjectSchema>) => {
      try {
        const response = await weaveApiClient.post("/projects", args);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  update_project: {
    name: "update_project",
    description: "Update an existing project",
    schema: updateProjectSchema,
    handler: async (args: z.infer<typeof updateProjectSchema>) => {
      try {
        const { projectId, ...payload } = args;
        const response = await weaveApiClient.patch(`/projects/${projectId}`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  delete_project: {
    name: "delete_project",
    description: "Delete a project",
    schema: deleteProjectSchema,
    handler: async (args: z.infer<typeof deleteProjectSchema>) => {
      try {
        const response = await weaveApiClient.delete(`/projects/${args.projectId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_project_stats: {
    name: "get_project_stats",
    description: "Get statistics across all projects",
    schema: getProjectStatsSchema,
    handler: async () => {
      try {
        const response = await weaveApiClient.get("/projects/stats");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  list_project_stages: {
    name: "list_project_stages",
    description: "List stages for a project's board",
    schema: listProjectStagesSchema,
    handler: async (args: z.infer<typeof listProjectStagesSchema>) => {
      try {
        const response = await weaveApiClient.get(`/projects/${args.projectId}/stages`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  update_project_stage: {
    name: "update_project_stage",
    description: "Update a project stage",
    schema: updateProjectStageSchema,
    handler: async (args: z.infer<typeof updateProjectStageSchema>) => {
      try {
        const { projectId, stageId, ...payload } = args;
        const response = await weaveApiClient.patch(`/projects/${projectId}/stages/${stageId}`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  delete_project_stage: {
    name: "delete_project_stage",
    description: "Delete a project stage",
    schema: deleteProjectStageSchema,
    handler: async (args: z.infer<typeof deleteProjectStageSchema>) => {
      try {
        const response = await weaveApiClient.delete(`/projects/${args.projectId}/stages/${args.stageId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_project_notes: {
    name: "get_project_notes",
    description: "Get all notes (tasks) in a project",
    schema: getProjectNotesSchema,
    handler: async (args: z.infer<typeof getProjectNotesSchema>) => {
      try {
        const response = await weaveApiClient.get(`/projects/${args.projectId}/notes`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  update_note_stage: {
    name: "update_note_stage",
    description: "Move a note (task) to a different stage in a project board",
    schema: updateNoteStageSchema,
    handler: async (args: z.infer<typeof updateNoteStageSchema>) => {
      try {
        const { projectId, noteId, stageId } = args;
        const response = await weaveApiClient.put(`/projects/${projectId}/notes/${noteId}/stage`, { stageId });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  create_task_in_stage: {
    name: "create_task_in_stage",
    description: "Create a new task directly in a specific project stage",
    schema: createTaskInStageSchema,
    handler: async (args: z.infer<typeof createTaskInStageSchema>) => {
      try {
        const { projectId, stageId, ...payload } = args;
        const response = await weaveApiClient.post(`/projects/${projectId}/stages/${stageId}/tasks`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
};
