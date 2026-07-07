import { AxiosInstance } from "axios";
import { McpResourceDefinition } from "../../../types/mcp";

export const createCommentsResources = (apiClient: AxiosInstance): McpResourceDefinition => ({
  templates: [
    {
      uriTemplate: "weave://notes/{noteId}/comments",
      name: "Note Comments",
      description: "List of comments on a specific note",
      mimeType: "application/json"
    }
  ],
  readHandler: async (uri: string) => {
    const match = uri.match(/^weave:\/\/notes\/([^/]+)\/comments$/);
    if (!match) return null;
    
    const noteId = match[1];
    const response = await apiClient.get(`/notes/${noteId}/comments`);
    
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(response.data, null, 2)
        }
      ]
    };
  }
});
