import { AxiosInstance } from "axios";
import { McpResourceDefinition } from "../../../types/mcp";

export const createUsersResources = (apiClient: AxiosInstance): McpResourceDefinition => ({
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
    
    const response = await apiClient.get("/users/me");
    
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
