import { McpToolDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";
import {
  getGoogleAuthUrlSchema,
  getGoogleCalendarStatusSchema,
  disconnectGoogleCalendarSchema,
} from "../schemas/webhooks.schema";

export const webhookTools: Record<string, McpToolDefinition<any>> = {
  get_google_auth_url: {
    name: "get_google_auth_url",
    description: "Get Google Calendar authentication URL",
    schema: getGoogleAuthUrlSchema,
    handler: async () => {
      try {
        const response = await weaveApiClient.get("/webhooks/google/auth");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_google_calendar_status: {
    name: "get_google_calendar_status",
    description: "Get Google Calendar connection status",
    schema: getGoogleCalendarStatusSchema,
    handler: async () => {
      try {
        const response = await weaveApiClient.get("/webhooks/google/calendar/status");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  disconnect_google_calendar: {
    name: "disconnect_google_calendar",
    description: "Disconnect Google Calendar integration",
    schema: disconnectGoogleCalendarSchema,
    handler: async () => {
      try {
        const response = await weaveApiClient.delete("/webhooks/google/calendar/disconnect");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
};
