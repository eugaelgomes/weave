/**
 * @module weave-engine/modules/core/tools/schemas/note.schema
 * @description JSON Schema definition for the note.schema AI tool.
 */
const { z } = require("zod");

const getNoteDetailsZodSchema = z.object({
  noteId: z
    .string()
    .describe(
      "The UUID or public ID (public_note_id) of the note/task to retrieve."
    ),
});

const readNoteContentZodSchema = z.object({
  noteId: z
    .string()
    .describe(
      "The UUID or public ID (public_note_id) of the note/task to read content from."
    ),
});

const listMyNotesZodSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of notes to return. Default 10, max 50."),
  orderBy: z
    .enum(["updated_at", "created_at", "due_date"])
    .optional()
    .describe("Field to order by. Defaults to updated_at."),
  orderDirection: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Order direction. Defaults to desc."),
  status: z
    .string()
    .optional()
    .describe("Filter by exact status (e.g., 'OPEN', 'IN_PROGRESS', 'DONE')."),
  projectId: z
    .string()
    .optional()
    .describe("Filter by specific project UUID or public_project_id."),
});

const schemas = [
  {
    name: "get_note_details",
    description:
      "Fetches the header/metadata of a specific note or task the user owns or collaborates on. Returns title, status, due date, priority, tags (resolved with name and color), attached files, relations, URLs, collaborators, and the associated project. Does NOT return the full content blocks — use read_note_content to read the actual note content blocks. (Important: Translate any enum values returned by the database to the user's language.)",
    parameters: getNoteDetailsZodSchema.toJSONSchema(),
  },
  {
    name: "read_note_content",
    description:
      "Reads the full content blocks of a specific note or task. Use this when you need to understand the exact subject, context, or inner details of a task beyond its title and description. Returns an array of block objects.",
    parameters: readNoteContentZodSchema.toJSONSchema(),
  },
  {
    name: "list_my_notes",
    description:
      "Fetches a list of the user's notes/tasks based on structured database filters like limit, sorting (e.g., most recent), status, and project. ALWAYS prioritize using this tool over search_my_notes when the user asks for 'latest', 'recent', chronological lists, or asks to see tasks of a specific project/status. Semantic search is bad for chronological filtering. Returns metadata, but not full content blocks.",
    parameters: listMyNotesZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  get_note_details: getNoteDetailsZodSchema,
  read_note_content: readNoteContentZodSchema,
  list_my_notes: listMyNotesZodSchema,
};

module.exports = { schemas, zodSchemas };
