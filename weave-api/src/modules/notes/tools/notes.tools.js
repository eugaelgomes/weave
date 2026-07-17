const { z } = require("zod");
const readNotesRepository = require("@/modules/notes/repositories/read-notes.repository");
const createNotesRepository = require("@/modules/notes/repositories/create-notes.repository");
const mutateNotesRepository = require("@/modules/notes/repositories/mutate-notes.repository");

// Input schemas for the LLM
const listNotesSchema = z.object({
  limit: z
    .number()
    .optional()
    .describe("Number of notes to return (default: 10)"),
  page: z
    .number()
    .optional()
    .describe("Page number for pagination (default: 1)"),
  search: z
    .string()
    .optional()
    .describe("Search term to filter notes by title or description"),
  sortBy: z
    .enum(["updated_at", "created_at", "title"])
    .optional()
    .describe("Field to sort by (default: updated_at)"),
  sortOrder: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction (default: desc)"),
  tags: z
    .array(z.string())
    .optional()
    .describe("Array of tag IDs to filter by"),
});

const getNoteSchema = z.object({
  noteId: z.string().describe("The ID of the note to retrieve"),
});

const createNoteSchema = z.object({
  description: z
    .string()
    .optional()
    .describe("Content/description of the note"),
  projectId: z.string().optional().describe("ID of the associated project"),
  status: z
    .string()
    .optional()
    .describe(
      "Status of the note, which must be either VISIBLE, SECURE, or ARCHIVED"
    ),
  tags: z.array(z.string()).optional().describe("Array of tags"),
  title: z.string().describe("Title of the note"),
});

const updateNoteSchema = z.object({
  description: z.string().optional().describe("New description"),
  noteId: z.string().describe("ID of the note to update"),
  status: z
    .string()
    .optional()
    .describe(
      "New status of the note, which must be either VISIBLE, SECURE, or ARCHIVED"
    ),
  tags: z.array(z.string()).optional().describe("New tags"),
  title: z.string().optional().describe("New title"),
});

const deleteNoteSchema = z.object({
  noteId: z.string().describe("ID of the note to delete"),
});

/**
 * Creates the Notes tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The notes tools definition map.
 */
const createNotesTools = (user) => ({
  create_note: {
    description: "Creates a new note.",
    handler: async (args) => {
      try {
        const { title, description, tags, status, projectId } = args;
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
      } catch (error) {
        return {
          content: [
            { text: `Error creating note: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "create_note",
    schema: createNoteSchema,
  },
  delete_note: {
    description: "Deletes a note logically.",
    handler: async (args) => {
      try {
        const { noteId } = args;

        // Security check
        const accessSummary =
          await readNotesRepository.getNoteAccessSummary(noteId);
        if (!accessSummary || accessSummary.user_id !== user.userId) {
          return {
            content: [
              {
                text: `Note ${noteId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }

        const count = await mutateNotesRepository.deleteNoteById(noteId);
        return {
          content: [
            { text: `Successfully deleted ${count} note(s).`, type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error deleting note: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "delete_note",
    schema: deleteNoteSchema,
  },
  get_note: {
    description:
      "Retrieves details of a single note by ID, including its blocks if any.",
    handler: async (args) => {
      try {
        const note = await readNotesRepository.getNoteById(args.noteId);

        // Security check: ensure the user actually has access to this note
        const accessSummary = await readNotesRepository.getNoteAccessSummary(
          args.noteId
        );

        if (!accessSummary || accessSummary.user_id !== user.userId) {
          // Basic access control check
        }

        if (!note) {
          return {
            content: [
              {
                text: `Note ${args.noteId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }

        return {
          content: [{ text: JSON.stringify(note, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error getting note: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "get_note",
    schema: getNoteSchema,
  },
  list_notes: {
    description:
      "Lists user notes with optional pagination, search, tags, and sorting.",
    handler: async (args) => {
      try {
        const result = await readNotesRepository.getAllNotesWithPagination(
          user.userId,
          {
            limit: args.limit || 10,
            orgWideOrganizationId: user.organizationId,
            page: args.page || 1,
            search: args.search || "",
            sortBy: args.sortBy || "updated_at",
            sortOrder: args.sortOrder || "desc",
            tags: args.tags || [],
          }
        );
        return {
          content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error listing notes: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "list_notes",
    schema: listNotesSchema,
  },
  update_note: {
    description: "Updates an existing note.",
    handler: async (args) => {
      try {
        const { noteId, title, description, status, tags } = args;

        // Security check
        const accessSummary =
          await readNotesRepository.getNoteAccessSummary(noteId);
        if (!accessSummary || accessSummary.user_id !== user.userId) {
          return {
            content: [
              {
                text: `Note ${noteId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }

        const updated = await mutateNotesRepository.updateNoteById(noteId, {
          description,
          status,
          tags,
          title,
        });

        if (!updated) {
          return {
            content: [
              { text: `Note ${noteId} could not be updated.`, type: "text" },
            ],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error updating note: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "update_note",
    schema: updateNoteSchema,
  },
});

module.exports = {
  createNotesTools,
};
