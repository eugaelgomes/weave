import { McpResourceDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";

export const calendarResources: McpResourceDefinition = {
  templates: [
    {
      uriTemplate: "weave://calendar/events",
      name: "Upcoming Events List",
      description: "List of upcoming calendar events",
      mimeType: "application/json",
    },
  ],
  readHandler: async (uri: string) => {
    if (uri === "weave://calendar/events") {
      const response = await weaveApiClient.get("/calendar-events");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
};
