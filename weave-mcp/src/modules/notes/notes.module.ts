import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createNotesTools } from "./tools/notes.tools";
import { createNotesResources } from "./resources/notes.resources";
import { createNotesPrompts } from "./prompts/notes.prompts";

/**
 * Factory that creates the Notes module definition with tools, resources,
 * and prompts bound to the provided API client instance.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete notes module definition.
 */
export const createNotesModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createNotesTools(apiClient),
  resources: createNotesResources(apiClient),
  prompts: createNotesPrompts(apiClient),
});
