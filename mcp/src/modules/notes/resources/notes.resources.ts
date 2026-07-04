import { weaveApiClient } from "../../../services/weave-api.client";
import { McpResourceDefinition } from "../../../types/mcp";

export const notesResources: McpResourceDefinition = {
  templates: [
    {
      uriTemplate: "weave://notes/{noteId}",
      name: "Individual Note",
      description: "Complete content of a specific note",
      mimeType: "text/markdown"
    }
  ],
  readHandler: async (uri: string) => {
    const match = uri.match(/^weave:\/\/notes\/([^/]+)$/);
    if (!match) return null;
    
    const noteId = match[1];
    const response = await weaveApiClient.get(`/notes/${noteId}`);
    
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: `# ${response.data.title}\n\n${response.data.content}`
        }
      ]
    };
  }
};
