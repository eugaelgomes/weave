import {
  listNotesSchema,
  getNoteSchema,
  createNoteToolSchema,
  createCompleteNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
  getNotesStatsSchema,
  ListNotesInput,
  GetNoteInput,
  CreateNoteToolInput,
  CreateCompleteNoteInput,
  UpdateNoteInput,
  DeleteNoteInput,
  GetNotesStatsInput,
} from "../schemas/notes.schema";
import { weaveApiClient } from "../../../services/weave-api.client";
import { McpToolDefinition } from "../../../types/mcp";

export const notesTools: Record<string, McpToolDefinition<any>> = {
  list_notes: {
    name: "list_notes",
    description: "Lists user notes with optional pagination and search query.",
    schema: listNotesSchema,
    handler: async (args: ListNotesInput) => {
      try {
        const response = await weaveApiClient.get("/notes", { params: args });
        return {
          content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error listing notes: ${error.message}` }] };
      }
    }
  },
  get_note: {
    name: "get_note",
    description: "Retrieves details of a single note by ID.",
    schema: getNoteSchema,
    handler: async (args: GetNoteInput) => {
      try {
        const response = await weaveApiClient.get(`/notes/${args.noteId}`);
        return {
          content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error getting note: ${error.message}` }] };
      }
    }
  },
  create_note: {
    name: "create_note",
    description: "Creates a new note on the Weave AI platform.",
    schema: createNoteToolSchema,
    handler: async (args: CreateNoteToolInput) => {
      try {
        const response = await weaveApiClient.post("/notes", args);
        return {
          content: [{ type: "text", text: `Note "${response.data.title}" successfully created! ID: ${response.data.id}` }]
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error creating note: ${error.message}` }] };
      }
    }
  },
  create_complete_note: {
    name: "create_complete_note",
    description: "Creates a new note with complete blocks.",
    schema: createCompleteNoteSchema,
    handler: async (args: CreateCompleteNoteInput) => {
      try {
        const response = await weaveApiClient.post("/notes/complete", args);
        return {
          content: [{ type: "text", text: `Complete note "${response.data.title}" successfully created! ID: ${response.data.id}` }]
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error creating complete note: ${error.message}` }] };
      }
    }
  },
  update_note: {
    name: "update_note",
    description: "Updates the title/content of a note.",
    schema: updateNoteSchema,
    handler: async (args: UpdateNoteInput) => {
      try {
        const { noteId, ...payload } = args;
        const response = await weaveApiClient.put(`/notes/${noteId}`, payload);
        return {
          content: [{ type: "text", text: `Note ${noteId} successfully updated!` }]
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error updating note: ${error.message}` }] };
      }
    }
  },
  delete_note: {
    name: "delete_note",
    description: "Soft-deletes a note by ID.",
    schema: deleteNoteSchema,
    handler: async (args: DeleteNoteInput) => {
      try {
        await weaveApiClient.delete(`/notes/${args.noteId}`);
        return {
          content: [{ type: "text", text: `Note ${args.noteId} successfully deleted.` }]
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error deleting note: ${error.message}` }] };
      }
    }
  },
  get_notes_stats: {
    name: "get_notes_stats",
    description: "Gets total count and status breakdown of notes.",
    schema: getNotesStatsSchema,
    handler: async (args: GetNotesStatsInput) => {
      try {
        const response = await weaveApiClient.get("/notes/stats");
        return {
          content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
        };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error getting notes stats: ${error.message}` }] };
      }
    }
  }
};
