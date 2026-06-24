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
    name: "web_search",
    description: "Searches the web for current information and facts.",
    parameters: webSearchZodSchema.toJSONSchema(),
  },
  {
    name: "read_url",
    description: "Reads the textual content of a specified webpage URL.",
    parameters: readUrlZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  web_search: webSearchZodSchema,
  read_url: readUrlZodSchema,
};

module.exports = { schemas, zodSchemas };
