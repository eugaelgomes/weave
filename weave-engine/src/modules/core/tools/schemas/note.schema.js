/**
 * @module weave-engine/modules/core/tools/schemas/note.schema
 * @description JSON Schema definition for the note.schema AI tool.
 */
const { z } = require("zod");

const getNoteDetailsZodSchema = z.object({
  noteId: z.string().describe("The UUID or public ID (public_note_id) of the note/task to retrieve."),
});

const schemas = [
  {
    name: "get_note_details",
    description:
      "Fetches the header/metadata of a specific note or task the user owns or collaborates on. Returns title, status, due date, priority, tags (resolved with name and color), attached files, relations, URLs, collaborators, and the associated project. Does NOT return the full content blocks — use search_my_notes for content-based lookup.",
    parameters: getNoteDetailsZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  get_note_details: getNoteDetailsZodSchema,
};

module.exports = { schemas, zodSchemas };
