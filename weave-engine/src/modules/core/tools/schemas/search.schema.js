/**
 * @module weave-engine/modules/core/tools/schemas/search.schema
 * @description JSON Schema definition for the search.schema AI tool.
 */
const schemas = [
  {
    name: "search_my_notes",
    description:
      "Searches the user's personal notes (also known as tasks) based on a keyword query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword or phrase to search for in notes/tasks.",
        },
      },
      required: ["query"],
    },
  },
];

module.exports = { schemas };
