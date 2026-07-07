import { listCommentsSchema, createCommentSchema, updateCommentSchema, deleteCommentSchema, ListCommentsInput, CreateCommentInput, UpdateCommentInput, DeleteCommentInput } from "../schemas/comments.schema";
import { AxiosInstance } from "axios";
import { McpToolDefinition } from "../../../types/mcp";

export const createCommentsTools = (apiClient: AxiosInstance): Record<string, McpToolDefinition<any>> => ({
  list_comments: {
    name: "list_comments",
    description: "Retrieves comments for a specific note.",
    schema: listCommentsSchema,
    handler: async (args: ListCommentsInput) => {
      try {
        const response = await apiClient.get(`/notes/${args.noteId}/comments`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error listing comments: ${error.message}` }] };
      }
    }
  },
  create_comment: {
    name: "create_comment",
    description: "Adds a new comment text to a note.",
    schema: createCommentSchema,
    handler: async (args: CreateCommentInput) => {
      try {
        const { noteId, ...payload } = args;
        const response = await apiClient.post(`/notes/${noteId}/comments`, payload);
        return { content: [{ type: "text", text: `Comment created successfully! ID: ${response.data.id}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error creating comment: ${error.message}` }] };
      }
    }
  },
  update_comment: {
    name: "update_comment",
    description: "Modifies an existing comment.",
    schema: updateCommentSchema,
    handler: async (args: UpdateCommentInput) => {
      try {
        const { noteId, commentId, ...payload } = args;
        const response = await apiClient.put(`/notes/${noteId}/comments/${commentId}`, payload);
        return { content: [{ type: "text", text: `Comment ${commentId} updated successfully!` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error updating comment: ${error.message}` }] };
      }
    }
  },
  delete_comment: {
    name: "delete_comment",
    description: "Deletes a comment.",
    schema: deleteCommentSchema,
    handler: async (args: DeleteCommentInput) => {
      try {
        const { noteId, commentId } = args;
        await apiClient.delete(`/notes/${noteId}/comments/${commentId}`);
        return { content: [{ type: "text", text: `Comment ${commentId} deleted successfully.` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error deleting comment: ${error.message}` }] };
      }
    }
  }
});
