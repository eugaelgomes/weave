import { getMyProfileSchema, searchUsersSchema, GetMyProfileInput, SearchUsersInput } from "../schemas/users.schema";
import { AxiosInstance } from "axios";
import { McpToolDefinition } from "../../../types/mcp";

export const createUsersTools = (apiClient: AxiosInstance): Record<string, McpToolDefinition<any>> => ({
  get_my_profile: {
    name: "get_my_profile",
    description: "Get authenticated user profile.",
    schema: getMyProfileSchema,
    handler: async (args: GetMyProfileInput) => {
      try {
        const response = await apiClient.get("/users/me");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error getting profile: ${error.message}` }] };
      }
    }
  },
  search_users: {
    name: "search_users",
    description: "Search team members by name or email.",
    schema: searchUsersSchema,
    handler: async (args: SearchUsersInput) => {
      try {
        const response = await apiClient.get("/users/search", { params: args });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error searching users: ${error.message}` }] };
      }
    }
  }
});
