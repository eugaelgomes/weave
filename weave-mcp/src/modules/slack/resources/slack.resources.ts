import { McpResourceDefinition } from "../../../types/mcp";
import { AxiosInstance } from "axios";

export const createSlackResources = (apiClient: AxiosInstance): McpResourceDefinition => ({
  templates: [
    {
      uriTemplate: "weave://slack/status",
      name: "Slack Integration Status",
      description: "Details of the Slack integration status",
      mimeType: "application/json",
    },
  ],
  readHandler: async (uri: string) => {
    if (uri === "weave://slack/status") {
      const response = await apiClient.get("/slack/integrations");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
});
