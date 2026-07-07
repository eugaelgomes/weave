import { McpResourceDefinition } from "../../../types/mcp";
import { AxiosInstance } from "axios";

export const createWebhookResources = (apiClient: AxiosInstance): McpResourceDefinition => ({
  templates: [
    {
      uriTemplate: "weave://integrations/google/status",
      name: "Google Calendar Connection Status",
      description: "Details of the Google Calendar integration status",
      mimeType: "application/json",
    },
  ],
  readHandler: async (uri: string) => {
    if (uri === "weave://integrations/google/status") {
      const response = await apiClient.get("/webhooks/google/calendar/status");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
});
