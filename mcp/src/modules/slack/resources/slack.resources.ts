import { McpResourceDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";

export const slackResources: McpResourceDefinition = {
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
      const response = await weaveApiClient.get("/slack/integrations");
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
};
