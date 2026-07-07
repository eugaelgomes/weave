import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createProjectTools } from "./tools/projects.tools";
import { createProjectResources } from "./resources/projects.resources";
import { createProjectsPrompts } from "./prompts/projects.prompts";

/**
 * Factory that creates the Projects module definition with tools, resources,
 * and prompts bound to the provided API client instance.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete projects module definition.
 */
export const createProjectsModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createProjectTools(apiClient),
  resources: createProjectResources(apiClient),
  prompts: createProjectsPrompts(apiClient),
});
