import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createWeaveAiTools } from "./tools/weave-ai.tools";
import { createWeaveAiResources } from "./resources/weave-ai.resources";

/**
 * Factory that creates the Weave AI module definition bound to the provided API client.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete weave-ai module definition.
 */
export const createWeaveAiModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createWeaveAiTools(apiClient),
  resources: createWeaveAiResources(apiClient),
});
