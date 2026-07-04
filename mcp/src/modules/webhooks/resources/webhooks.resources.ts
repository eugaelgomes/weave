import { McpResourceDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";

export const webhookResources: McpResourceDefinition = {
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
      const response = await weaveApiClient.get("/webhooks/google/calendar/status");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
};
