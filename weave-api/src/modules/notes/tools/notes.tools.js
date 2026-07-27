const { z } = require("zod");
const readNotesRepository = require("@/modules/notes/repositories/read-notes.repository");
const createNotesRepository = require("@/modules/notes/repositories/create-notes.repository");
const mutateNotesRepository = require("@/modules/notes/repositories/mutate-notes.repository");

const manageNotesSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    description: z
      .string()
      .optional()
      .describe("Content/description of the note"),
    projectId: z.string().optional().describe("ID of the associated project"),
    status: z
      .string()
      .optional()
      .describe("Status of the note (VISIBLE, SECURE, ARCHIVED)"),
    tags: z.array(z.string()).optional().describe("Array of tags"),
    title: z.string().describe("Title of the note"),
  }),
  z.object({
    action: z.literal("update"),
    description: z.string().optional().describe("New description"),
    noteId: z.string().describe("ID of the note to update"),
    status: z.string().optional().describe("New status"),
    tags: z.array(z.string()).optional().describe("New tags"),
    title: z.string().optional().describe("New title"),
  }),
  z.object({
    action: z.literal("delete"),
    noteId: z.string().describe("ID of the note to delete"),
  }),
  z.object({
    action: z.literal("get"),
    noteId: z.string().describe("ID of the note to retrieve"),
  }),
  z.object({
    action: z.literal("list"),
    limit: z
      .number()
      .optional()
      .describe("Number of notes to return (default: 10)"),
    page: z
      .number()
      .optional()
      .describe("Page number for pagination (default: 1)"),
    search: z.string().optional().describe("Search term to filter notes"),
    sortBy: z
      .enum(["updated_at", "created_at", "title"])
      .optional()
      .describe("Field to sort by"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  }),
]);

const createNotesTools = (user) => ({
  manage_notes: {
    description:
      "Manage notes (create, update, delete, get, list). Use this tool to query or modify notes metadata.",
    handler: async (args) => {
      try {
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
          const newNote = await createNotesRepository.createNotesQuery(
            user.userId,
            title,
            description,
            tags,
            status,
            projectId
          );
          return {
            content: [{ text: JSON.stringify(newNote, null, 2), type: "text" }],
          };
        }

        if (action === "get") {
          if (!noteId) throw new Error("noteId is required for get action");
          const note = await readNotesRepository.getNoteById(
            noteId,
            user.userId
          );
          if (!note)
            throw new Error(`Note ${noteId} not found or access denied.`);

          const noteBlocksRepository = require("@/modules/notes/repositories/note-blocks.repository");
          const blocks = await noteBlocksRepository.findTreeByNoteId(
            args.noteId
          );
          note.blocks = blocks;

          return {
            content: [{ text: JSON.stringify(note, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!noteId) throw new Error("noteId is required for update action");
          const accessSummary =
            await readNotesRepository.getNoteAccessSummary(noteId);
          if (!accessSummary || accessSummary.user_id !== user.userId) {
            throw new Error(`Note ${noteId} not found or access denied.`);
          }
          const updated = await mutateNotesRepository.updateNoteById(noteId, {
            description,
            status,
            tags,
            title,
          });
          if (!updated) throw new Error(`Note ${noteId} could not be updated.`);
          return {
            content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!noteId) throw new Error("noteId is required for delete action");
          const count = await mutateNotesRepository.softDeleteNotes(
            [noteId],
            user.userId
          );
          return {
            content: [
              { text: `Successfully deleted ${count} note(s).`, type: "text" },
            ],
          };
        }

        if (action === "list") {
          const result = await readNotesRepository.listNotes(user.userId, {
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
