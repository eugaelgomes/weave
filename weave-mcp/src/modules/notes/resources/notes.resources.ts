import { AxiosInstance } from "axios";
import { McpResourceDefinition } from "../../../types/mcp";

export const createNotesResources = (apiClient: AxiosInstance): McpResourceDefinition => ({
  templates: [
    {
      uriTemplate: "weave://notes/{noteId}",
      name: "Individual Note",
      description: "Complete JSON representation of a specific note, including its structured blocks and properties",
      mimeType: "application/json"
    },
    {
      uriTemplate: "weave://notes/{noteId}/blocks",
      name: "Note Blocks",
      description: "JSON array of the structured blocks for a specific note",
      mimeType: "application/json"
    }
  ],
  readHandler: async (uri: string) => {
    const noteMatch = uri.match(/^weave:\/\/notes\/([^/]+)$/);
    if (noteMatch) {
      const noteId = noteMatch[1];
      const response = await apiClient.get(`/notes/${noteId}`);
      
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

    const blocksMatch = uri.match(/^weave:\/\/notes\/([^/]+)\/blocks$/);
    if (blocksMatch) {
      const noteId = blocksMatch[1];
      const response = await apiClient.get(`/notes/${noteId}`);
      
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(response.data.blocks || [], null, 2)
          }
        ]
      };
    }

    return null;
  }
});
