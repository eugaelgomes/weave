/**
 * @module weave-engine/modules/core/tools/schemas/web-browser.schema
 * @description JSON Schema definition for the web-browser.schema AI tool.
 */
const schemas = [
  {
    name: "web_search",
    description: "Searches the web for current information and facts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_url",
    description: "Reads the textual content of a specified webpage URL.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The complete URL to read.",
        },
      },
      required: ["url"],
    },
  },
];

module.exports = { schemas };
