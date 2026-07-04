import { weaveApiClient } from "../../../services/weave-api.client";
import { McpResourceDefinition } from "../../../types/mcp";

export const usersResources: McpResourceDefinition = {
  templates: [
    {
      uriTemplate: "weave://users/me",
      name: "Current User Profile",
      description: "Current user profile data",
      mimeType: "application/json"
    }
  ],
  readHandler: async (uri: string) => {
    if (uri !== "weave://users/me") return null;
    
    const response = await weaveApiClient.get("/users/me");
    
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
};
