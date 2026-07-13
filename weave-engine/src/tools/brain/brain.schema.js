/**
 * @module weave-engine/modules/core/tools/schemas/brain.schema
 * @description JSON Schema definition for the brain.schema AI tool.
 */
const { z } = require("zod");

const consultBrainZodSchema = z.object({});

const schemas = [
  {
    description:
      "Fetches the Weave-AI Agent Brain Manual. Use this tool ONLY when the user asks about your capabilities, what you can do, how you work, what tools you have access to, or what the Weave ecosystem is (Weave, Weave Engine, Weave App). Do not guess your capabilities or the platform's architecture; always consult this brain. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "consult_brain",
    parameters: consultBrainZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  consult_brain: consultBrainZodSchema,
};

module.exports = { schemas, zodSchemas };
