const { manageNotesSchema } = require("../schemas/tools.schema");
const { NotesService } = require("../services/notes.service");

const createNotesTools = (user) => ({
  manage_notes: {
    description:
      "Manage notes (create, update, delete, get, list). Use this tool to query or modify notes metadata.",
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const {
          action,
          noteId,
          title,
          description,
          tags,
          status,
          projectId,
          limit,
          page,
          search,
          sortBy,
          sortOrder,
        } = args;

        if (action === "create") {
          if (!title) throw new Error("title is required for create action");
          const newNote = await NotesService.createNote(userId, {
            description,
            project_id: projectId,
            status,
            tags,
            title,
          });
          return {
            content: [{ text: JSON.stringify(newNote, null, 2), type: "text" }],
          };
        }

        if (action === "get") {
          if (!noteId) throw new Error("noteId is required for get action");
          const note = await NotesService.getNoteById(noteId, userId);
          return {
            content: [{ text: JSON.stringify(note, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!noteId) throw new Error("noteId is required for update action");
          const currentNote = await NotesService.getNoteById(noteId, userId);
          const updated = await NotesService.updateNote(userId, noteId, {
            baseRevision: currentNote.revision,
            description,
            status,
            tags,
            title,
          });
          return {
            content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!noteId) throw new Error("noteId is required for delete action");
          const count = await NotesService.deleteNote(userId, noteId);
          return {
            content: [
              { text: `Successfully deleted ${count} note(s).`, type: "text" },
            ],
          };
        }

        if (action === "list") {
          const result = await NotesService.getAllNotes(userId, {
            limit: limit || 10,
            page: page || 1,
            search,
            sortBy: sortBy || "updated_at",
            sortOrder: sortOrder || "desc",
            tags: tags || [],
          });
          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            { text: `Error in manage_notes: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "manage_notes",
    schema: manageNotesSchema,
  },
});

module.exports = { createNotesTools };
