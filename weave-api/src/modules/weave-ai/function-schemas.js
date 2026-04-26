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
  update_note_collaborator_add: {
    category: FunctionCategory.NOTES,
    description: "Add a collaborator to an existing note.",
    name: "update_note_collaborator_add",
    parameters: {
      additionalProperties: false,
      properties: {
        collaboratorUserId: { type: "string" },
        noteId: { type: "string" },
      },
      required: ["noteId", "collaboratorUserId"],
      type: "object",
    },
  },
  update_note_collaborator_remove: {
    category: FunctionCategory.NOTES,
    description: "Remove a collaborator from an existing note.",
    name: "update_note_collaborator_remove",
    parameters: {
      additionalProperties: false,
      properties: {
        collaboratorUserId: { type: "string" },
        noteId: { type: "string" },
      },
      required: ["noteId", "collaboratorUserId"],
      type: "object",
    },
  },
  update_note_content: {
    category: FunctionCategory.NOTES,
    description:
      "Update an existing note body. Prefer rich body via document or blocks. Fallback to plain content if needed.",
    name: "update_note_content",
    parameters: {
      additionalProperties: false,
      properties: {
        blocks: {
          description:
            "Optional array of editor blocks. Prefer structured blocks like heading, paragraph, bulletList, orderedList, taskList/taskItem, blockquote and codeBlock.",
          items: { type: "object" },
          type: "array",
        },
        content: {
          description:
            "Fallback plain text content. Use only when document/blocks is not available.",
          type: "string",
        },
        document: {
          description:
            "Full note document payload expected by notes API. Use this for full-fidelity rich content and keep at least one meaningful text node.",
          type: "object",
        },
        noteId: { type: "string" },
      },
      required: ["noteId"],
      type: "object",
    },
  },
  update_note_due_date: {
    category: FunctionCategory.NOTES,
    description: "Update or clear note due date.",
    name: "update_note_due_date",
    parameters: {
      additionalProperties: false,
      properties: {
        dueDate: {
          description: "ISO datetime string or null to clear due date.",
          type: ["string", "null"],
        },
        noteId: { type: "string" },
      },
      required: ["noteId", "dueDate"],
      type: "object",
    },
  },
  update_note_priority: {
    category: FunctionCategory.NOTES,
    description: "Update note priority.",
    name: "update_note_priority",
    parameters: {
      additionalProperties: false,
      properties: {
        noteId: { type: "string" },
        priorityId: {
          description: "Priority UUID or null to clear.",
          type: ["string", "null"],
        },
      },
      required: ["noteId", "priorityId"],
      type: "object",
    },
  },
  update_note_stage: {
    category: FunctionCategory.NOTES,
    description: "Update note stage inside a project board.",
    name: "update_note_stage",
    parameters: {
      additionalProperties: false,
      properties: {
        noteId: { type: "string" },
        stageId: {
          description: "Project stage UUID or null to clear.",
          type: ["string", "null"],
        },
      },
      required: ["noteId", "stageId"],
      type: "object",
    },
  },
  update_note_tags: {
    category: FunctionCategory.NOTES,
    description: "Replace note tags with a full list.",
    name: "update_note_tags",
    parameters: {
      additionalProperties: false,
      properties: {
        noteId: { type: "string" },
        tags: {
          items: { type: "string" },
          type: "array",
        },
      },
      required: ["noteId", "tags"],
      type: "object",
    },
  },
  update_note_title: {
    category: FunctionCategory.NOTES,
    description: "Rename an existing note title.",
    name: "update_note_title",
    parameters: {
      additionalProperties: false,
      properties: {
        noteId: { type: "string" },
        title: { type: "string" },
      },
      required: ["noteId", "title"],
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
