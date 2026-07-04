import { McpResourceDefinition } from "../../../types/mcp";
import { weaveApiClient } from "../../../services/weave-api.client";

export const taskPriorityResources: McpResourceDefinition = {
  templates: [
    {
      uriTemplate: "weave://projects/{projectId}/priorities",
      name: "Project Priorities",
      description: "Get all priority configurations for a specific project",
      mimeType: "application/json",
    },
  ],
  readHandler: async (uri: string) => {
    const match = uri.match(/^weave:\/\/projects\/([^/]+)\/priorities$/);
    if (match) {
      const response = await weaveApiClient.get(`/task-priorities/${match[1]}/task-priorities`);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
};
