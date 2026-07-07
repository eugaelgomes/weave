import { McpResourceDefinition } from "../../../types/mcp";
import { AxiosInstance } from "axios";

export const createProjectResources = (apiClient: AxiosInstance): McpResourceDefinition => ({
  templates: [
    {
      uriTemplate: "weave://projects/{projectId}",
      name: "Project details",
      description: "Get detailed information about a specific project",
      mimeType: "application/json",
    },
    {
      uriTemplate: "weave://projects/{projectId}/stages",
      name: "Project stages",
      description: "Get the board stages for a specific project",
      mimeType: "application/json",
    },
    {
      uriTemplate: "weave://projects/{projectId}/tasks",
      name: "Project tasks",
      description: "Get all tasks within a specific project",
      mimeType: "application/json",
    },
  ],
  readHandler: async (uri: string) => {
    let match = uri.match(/^weave:\/\/projects\/([^/]+)$/);
    if (match) {
      const response = await apiClient.get(`/projects/${match[1]}`);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }

    match = uri.match(/^weave:\/\/projects\/([^/]+)\/stages$/);
    if (match) {
      const response = await apiClient.get(`/projects/${match[1]}/stages`);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }

    match = uri.match(/^weave:\/\/projects\/([^/]+)\/tasks$/);
    if (match) {
      const response = await apiClient.get(`/projects/${match[1]}/notes`);
      return {
        contents: [{ uri, mimeType: "application/json", text: JSON.stringify(response.data, null, 2) }],
      };
    }

    return null;
  }
});
