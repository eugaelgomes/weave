/**
 * @module weave-engine/modules/core/tools/schemas/search.schema
 * @description JSON Schema definition for the search.schema AI tool.
 */
const { z } = require("zod");

const searchMyNotesZodSchema = z.object({
  query: z.string().describe("Keyword or phrase to search for in notes/tasks."),
});

const schemas = [
  {
    description:
      "Searches the user's personal notes (also known as tasks) based on a keyword query. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "search_my_notes",
    parameters: searchMyNotesZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  search_my_notes: searchMyNotesZodSchema,
};

module.exports = { schemas, zodSchemas };
