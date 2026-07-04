import { weaveApiClient } from "../../../services/weave-api.client";
import { McpToolDefinition } from "../../../types/mcp";
import {
  listNotesSchema,
  getNoteSchema,
  createNoteToolSchema,
  createCompleteNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
  getNotesStatsSchema,
  listNoteBlocksSchema,
  createNoteBlockSchema,
  updateNoteBlockSchema,
  deleteNoteBlockSchema,
  reorderNoteBlocksSchema,
  putSyncNoteBlocksSchema,
  getNoteCollaboratorsSchema,
  addNoteCollaboratorSchema,
  removeNoteCollaboratorSchema,
  ListNotesInput,
  GetNoteInput,
  CreateNoteToolInput,
  CreateCompleteNoteInput,
  UpdateNoteInput,
  DeleteNoteInput,
  GetNotesStatsInput,
  ListNoteBlocksInput,
  CreateNoteBlockInput,
  UpdateNoteBlockInput,
  DeleteNoteBlockInput,
  ReorderNoteBlocksInput,
  PutSyncNoteBlocksInput,
  GetNoteCollaboratorsInput,
  AddNoteCollaboratorInput,
  RemoveNoteCollaboratorInput
} from "../schemas/notes.schema";

export const notesTools: Record<string, McpToolDefinition<any>> = {
  // --- Notes Operations ---
  list_notes: {
    name: "list_notes",
    description: "Lists user notes with optional pagination, search, tags, and sorting.",
    schema: listNotesSchema,
    handler: async (args: ListNotesInput) => {
      try {
        const response = await weaveApiClient.get("/notes", { params: args });
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error listing notes: ${error.message}` }] };
      }
    }
  },
  get_note: {
    name: "get_note",
    description: "Retrieves details of a single note by ID, including its blocks if any.",
    schema: getNoteSchema,
    handler: async (args: GetNoteInput) => {
      try {
        const response = await weaveApiClient.get(`/notes/${args.noteId}`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error getting note: ${error.message}` }] };
      }
    }
  },
  create_note: {
    name: "create_note",
    description: "Creates a new note with basic fields, description, status, project and blocks.",
    schema: createNoteToolSchema,
    handler: async (args: CreateNoteToolInput) => {
      try {
        const response = await weaveApiClient.post("/notes", args);
        return { content: [{ type: "text", text: `Note "${response.data.title}" successfully created! ID: ${response.data.id}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error creating note: ${error.message}` }] };
      }
    }
  },
  create_complete_note: {
    name: "create_complete_note",
    description: "Creates a new note with complete initial block content string.",
    schema: createCompleteNoteSchema,
    handler: async (args: CreateCompleteNoteInput) => {
      try {
        const response = await weaveApiClient.post("/notes/complete", args);
        return { content: [{ type: "text", text: `Complete note "${response.data.title}" successfully created! ID: ${response.data.id}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error creating complete note: ${error.message}` }] };
      }
    }
  },
  update_note: {
    name: "update_note",
    description: "Updates the properties of a note.",
    schema: updateNoteSchema,
    handler: async (args: UpdateNoteInput) => {
      try {
        const { noteId, ...payload } = args;
        const response = await weaveApiClient.put(`/notes/${noteId}`, payload);
        return { content: [{ type: "text", text: `Note ${noteId} successfully updated!` }] };
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
        return { content: [{ type: "text", text: `Note ${args.noteId} successfully deleted.` }] };
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
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error getting notes stats: ${error.message}` }] };
      }
    }
  },

  // --- Blocks Operations ---
  list_note_blocks: {
    name: "list_note_blocks",
    description: "Lists all blocks for a given note ID.",
    schema: listNoteBlocksSchema,
    handler: async (args: ListNoteBlocksInput) => {
      try {
        const response = await weaveApiClient.get(`/notes/${args.noteId}/blocks`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error listing note blocks: ${error.message}` }] };
      }
    }
  },
  create_note_block: {
    name: "create_note_block",
    description: "Creates a new block inside a note.",
    schema: createNoteBlockSchema,
    handler: async (args: CreateNoteBlockInput) => {
      try {
        const { noteId, ...payload } = args;
        const response = await weaveApiClient.post(`/notes/${noteId}/blocks`, payload);
        return { content: [{ type: "text", text: `Block successfully created! ID: ${response.data.id}` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error creating note block: ${error.message}` }] };
      }
    }
  },
  update_note_block: {
    name: "update_note_block",
    description: "Updates a specific block inside a note.",
    schema: updateNoteBlockSchema,
    handler: async (args: UpdateNoteBlockInput) => {
      try {
        const { noteId, blockId, ...payload } = args;
        const response = await weaveApiClient.patch(`/notes/${noteId}/blocks/${blockId}`, payload);
        return { content: [{ type: "text", text: `Block ${blockId} successfully updated!` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error updating note block: ${error.message}` }] };
      }
    }
  },
  delete_note_block: {
    name: "delete_note_block",
    description: "Soft-deletes a specific block from a note.",
    schema: deleteNoteBlockSchema,
    handler: async (args: DeleteNoteBlockInput) => {
      try {
        await weaveApiClient.delete(`/notes/${args.noteId}/blocks/${args.blockId}`);
        return { content: [{ type: "text", text: `Block ${args.blockId} successfully deleted.` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error deleting note block: ${error.message}` }] };
      }
    }
  },
  reorder_note_blocks: {
    name: "reorder_note_blocks",
    description: "Reorders blocks under a parent inside a note.",
    schema: reorderNoteBlocksSchema,
    handler: async (args: ReorderNoteBlocksInput) => {
      try {
        const { noteId, ...payload } = args;
        const response = await weaveApiClient.post(`/notes/${noteId}/blocks/reorder`, payload);
        return { content: [{ type: "text", text: `Blocks successfully reordered!` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error reordering note blocks: ${error.message}` }] };
      }
    }
  },
  sync_note_blocks: {
    name: "sync_note_blocks",
    description: "Synchronizes/overwrites blocks array of a note (putSync).",
    schema: putSyncNoteBlocksSchema,
    handler: async (args: PutSyncNoteBlocksInput) => {
      try {
        const { noteId, ...payload } = args;
        const response = await weaveApiClient.put(`/notes/${noteId}/blocks`, payload);
        return { content: [{ type: "text", text: `Blocks successfully synced!` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error syncing note blocks: ${error.message}` }] };
      }
    }
  },

  // --- Collaborators Operations ---
  get_note_collaborators: {
    name: "get_note_collaborators",
    description: "Gets the collaborators for a note.",
    schema: getNoteCollaboratorsSchema,
    handler: async (args: GetNoteCollaboratorsInput) => {
      try {
        const response = await weaveApiClient.get(`/notes/${args.noteId}/collaborators`);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error getting note collaborators: ${error.message}` }] };
      }
    }
  },
  add_note_collaborator: {
    name: "add_note_collaborator",
    description: "Adds a user as a collaborator to a note.",
    schema: addNoteCollaboratorSchema,
    handler: async (args: AddNoteCollaboratorInput) => {
      try {
        const { noteId, ...payload } = args;
        const response = await weaveApiClient.post(`/notes/${noteId}/collaborators`, payload);
        return { content: [{ type: "text", text: `Collaborator successfully added to note ${noteId}!` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error adding note collaborator: ${error.message}` }] };
      }
    }
  },
  remove_note_collaborator: {
    name: "remove_note_collaborator",
    description: "Removes a collaborator from a note.",
    schema: removeNoteCollaboratorSchema,
    handler: async (args: RemoveNoteCollaboratorInput) => {
      try {
        await weaveApiClient.delete(`/notes/${args.noteId}/collaborators/${args.collaboratorId}`);
        return { content: [{ type: "text", text: `Collaborator successfully removed from note ${args.noteId}.` }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error removing note collaborator: ${error.message}` }] };
      }
    }
  }
};
