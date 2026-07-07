import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createUsersTools } from "./tools/users.tools";
import { createUsersResources } from "./resources/users.resources";

/**
 * Factory that creates the Users module definition bound to the provided API client.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete users module definition.
 */
export const createUsersModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createUsersTools(apiClient),
  resources: createUsersResources(apiClient),
  prompts: {},
});
