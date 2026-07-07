import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createSlackTools } from "./tools/slack.tools";
import { createSlackResources } from "./resources/slack.resources";

/**
 * Factory that creates the Slack module definition bound to the provided API client.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete slack module definition.
 */
export const createSlackModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createSlackTools(apiClient),
  resources: createSlackResources(apiClient),
});
