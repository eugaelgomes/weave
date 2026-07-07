import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createTaskPriorityTools } from "./tools/task-priorities.tools";
import { createTaskPriorityResources } from "./resources/task-priorities.resources";

/**
 * Factory that creates the Task Priorities module definition bound to the provided API client.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete task-priorities module definition.
 */
export const createTaskPrioritiesModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createTaskPriorityTools(apiClient),
  resources: createTaskPriorityResources(apiClient),
});
