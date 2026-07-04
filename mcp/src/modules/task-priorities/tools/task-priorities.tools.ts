import { McpToolDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";
import {
  listTaskPrioritiesSchema,
  createTaskPrioritySchema,
  updateTaskPrioritySchema,
  deleteTaskPrioritySchema,
} from "../schemas/task-priorities.schema";
import { z } from "zod";

export const taskPriorityTools: Record<string, McpToolDefinition<any>> = {
  list_task_priorities: {
    name: "list_task_priorities",
    description: "List all task priorities for a specific project",
    schema: listTaskPrioritiesSchema,
    handler: async (args: z.infer<typeof listTaskPrioritiesSchema>) => {
      try {
        const response = await weaveApiClient.get(`/task-priorities/${args.projectId}/task-priorities`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  create_task_priority: {
    name: "create_task_priority",
    description: "Create a new task priority configuration for a project",
    schema: createTaskPrioritySchema,
    handler: async (args: z.infer<typeof createTaskPrioritySchema>) => {
      try {
        const { projectId, ...payload } = args;
        const response = await weaveApiClient.post(`/task-priorities/${projectId}/create-priority`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  update_task_priority: {
    name: "update_task_priority",
    description: "Update an existing task priority",
    schema: updateTaskPrioritySchema,
    handler: async (args: z.infer<typeof updateTaskPrioritySchema>) => {
      try {
        const { projectId, priorityId, ...payload } = args;
        const response = await weaveApiClient.patch(`/task-priorities/${projectId}/task-priorities/${priorityId}`, payload);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  delete_task_priority: {
    name: "delete_task_priority",
    description: "Delete a task priority",
    schema: deleteTaskPrioritySchema,
    handler: async (args: z.infer<typeof deleteTaskPrioritySchema>) => {
      try {
        const response = await weaveApiClient.delete(`/task-priorities/${args.projectId}/task-priorities/${args.priorityId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
};
