import { AxiosInstance } from "axios";
import { McpModuleDefinition } from "../../types/mcp";
import { createCalendarTools } from "./tools/calendar.tools";
import { createCalendarResources } from "./resources/calendar.resources";

/**
 * Factory that creates the Calendar module definition bound to the provided API client.
 *
 * @param {AxiosInstance} apiClient - The session-scoped Axios client.
 * @returns {McpModuleDefinition} The complete calendar module definition.
 */
export const createCalendarModule = (apiClient: AxiosInstance): McpModuleDefinition => ({
  tools: createCalendarTools(apiClient),
  resources: createCalendarResources(apiClient),
});
