import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createWebhookTools } from "./tools/webhooks.tools";
import { createWebhookResources } from "./resources/webhooks.resources";

/**
 * Factory that creates the Webhooks module definition bound to the provided API client.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete webhooks module definition.
 */
export const createWebhooksModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createWebhookTools(apiClient),
  resources: createWebhookResources(apiClient),
});
