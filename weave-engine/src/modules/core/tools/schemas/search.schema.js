/**
 * @module weave-engine/modules/core/tools/schemas/search.schema
 * @description JSON Schema definition for the search.schema AI tool.
 */
const schemas = [
  {
    name: "search_my_notes",
    description: "Searches the user's personal notes based on a keyword query.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword or phrase to search for in notes.",
        },
      },
      required: ["query"],
    },
  },
];

module.exports = { schemas };
