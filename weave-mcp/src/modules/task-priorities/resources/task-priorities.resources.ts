import { McpResourceDefinition } from "../../../types/mcp";
import { AxiosInstance } from "axios";

export const createTaskPriorityResources = (apiClient: AxiosInstance): McpResourceDefinition => ({
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
      const response = await apiClient.get(`/task-priorities/${match[1]}/task-priorities`);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }
    return null;
  }
});
