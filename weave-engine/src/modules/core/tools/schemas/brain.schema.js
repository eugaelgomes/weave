/**
 * @module weave-engine/modules/core/tools/schemas/brain.schema
 * @description JSON Schema definition for the brain.schema AI tool.
 */
const schemas = [
  {
    name: "consult_brain",
    description:
      "Fetches the Weave-AI Agent Brain Manual. Use this tool ONLY when the user asks about your capabilities, what you can do, how you work, what tools you have access to, or what the Weave ecosystem is (Weave Notes, Weave Engine, Weave App). Do not guess your capabilities or the platform's architecture; always consult this brain.",
    parameters: {
      type: "object",
      properties: {}, // No parameters needed
      required: [],
    },
  },
];

module.exports = { schemas };
