const FunctionCategory = Object.freeze({
  BLOCKS: "blocks",
  NOTES: "notes",
  PROJECTS: "projects",
});

const FUNCTION_SCHEMAS = Object.freeze({
  create_note: {
    category: FunctionCategory.NOTES,
    description: "Create a new note in the user workspace.",
    name: "create_note",
    parameters: {
      additionalProperties: false,
      properties: {
        content: { type: "string" },
        projectId: { type: "string" },
        title: { type: "string" },
      },
      required: ["title"],
      type: "object",
    },
  },
  update_note_content: {
    category: FunctionCategory.NOTES,
    description: "Update an existing note content.",
    name: "update_note_content",
    parameters: {
      additionalProperties: false,
      properties: {
        content: { type: "string" },
        noteId: { type: "string" },
      },
      required: ["noteId", "content"],
      type: "object",
    },
  },
  update_project_title: {
    category: FunctionCategory.PROJECTS,
    description: "Rename an existing project.",
    name: "update_project_title",
    parameters: {
      additionalProperties: false,
      properties: {
        projectId: { type: "string" },
        title: { type: "string" },
      },
      required: ["projectId", "title"],
      type: "object",
    },
  },
});

/**
 * @returns {string[]}
 */
function getAvailableFunctionNames() {
  return Object.keys(FUNCTION_SCHEMAS);
}

/**
 * @param {string} functionName
 * @returns {object|null}
 */
function getFunctionSchema(functionName) {
  return FUNCTION_SCHEMAS[functionName] || null;
}

/**
 * Convert schema to OpenAI/Gemini tools format.
 *
 * @param {string} functionName
 * @returns {{name: string, description: string, parameters: object}|null}
 */
function toOpenAIFormat(functionName) {
  const schema = getFunctionSchema(functionName);
  if (!schema) {
    return null;
  }

  return {
    description: schema.description,
    name: schema.name,
    parameters: schema.parameters,
  };
}

module.exports = {
  FunctionCategory,
  getAvailableFunctionNames,
  getFunctionSchema,
  toOpenAIFormat,
};
