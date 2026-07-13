/**
 * @module weave-engine/modules/core/tools/schemas/web-browser.schema
 * @description JSON Schema definition for the web-browser.schema AI tool.
 */
const { z } = require("zod");

const webSearchZodSchema = z.object({
  query: z.string().describe("The search query."),
});

const readUrlZodSchema = z.object({
  url: z.string().describe("The complete URL to read."),
});

const schemas = [
  {
    description: "Searches the web for current information and facts.",
    name: "web_search",
    parameters: webSearchZodSchema.toJSONSchema(),
  },
  {
    description: "Reads the textual content of a specified webpage URL.",
    name: "read_url",
    parameters: readUrlZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  read_url: readUrlZodSchema,
  web_search: webSearchZodSchema,
};

module.exports = { schemas, zodSchemas };
