import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createCommentsTools } from "./tools/comments.tools";
import { createCommentsResources } from "./resources/comments.resources";

/**
 * Factory that creates the Comments module definition bound to the provided API client.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete comments module definition.
 */
export const createCommentsModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createCommentsTools(apiClient),
  resources: createCommentsResources(apiClient),
  prompts: {},
});
