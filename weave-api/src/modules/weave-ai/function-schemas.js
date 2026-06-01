const FunctionCategory = Object.freeze({
  BLOCKS: "blocks",
  NOTES: "notes",
  PROJECTS: "projects",
  USERS: "users",
});

/**
 * Shared detailed schema for structured editor blocks.
 * Used by create_note and update_note_content.
 */
const BLOCKS_SCHEMA = Object.freeze({
  description:
    "Array of structured editor blocks. ALWAYS use this instead of 'content' for rich formatting. Each block represents a visual element (heading, paragraph, list, etc.).",
  type: "array",
  items: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: [
          "paragraph",
          "heading",
          "quote",
          "code",
          "list",
          "todo",
          "divider",
        ],
        description: "Block type.",
      },
      properties: {
        type: "object",
        description: "Block content and attributes.",
        properties: {
          text: {
            type: "string",
            description: "Text content of the block.",
          },
          attrs: {
            type: "object",
            description: "Type-specific attributes.",
            properties: {
              level: {
                type: "integer",
                description:
                  "Heading level (1-6). Only for type=heading.",
              },
              language: {
                type: "string",
                description:
                  "Programming language identifier. Only for type=code.",
              },
              ordered: {
                type: "boolean",
                description:
                  "Whether the list is ordered. Only for type=list.",
              },
              checked: {
                type: "boolean",
                description:
                  "Whether the todo item is checked. Only for type=todo.",
              },
            },
          },
        },
      },
      children: {
        type: "array",
        description:
          "Child blocks for list items. Each child is a paragraph block with the list item text.",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["paragraph"],
            },
            properties: {
              type: "object",
              properties: {
                text: { type: "string" },
              },
            },
          },
        },
      },
    },
    required: ["type"],
  },
});

const FUNCTION_SCHEMAS = Object.freeze({
  create_note: {
    category: FunctionCategory.NOTES,
    description: "Create a new note or task in the user workspace.",
    name: "create_note",
    parameters: {
      additionalProperties: false,
      properties: {
        collaboratorIds: {
          items: { type: "string" },
          type: "array",
        },
        blocks: BLOCKS_SCHEMA,
        content: {
          type: "string",
          description:
            "Fallback plain text content. Avoid using this; prefer 'blocks' for structured formatting.",
        },
        dueDate: {
          description: "ISO datetime string.",
          type: "string",
        },
        files: {
          description:
            "Array of file references. Each object needs 'name' and 'url'.",
          items: {
            properties: {
              name: { type: "string" },
              url: { type: "string" },
            },
            required: ["name", "url"],
            type: "object",
          },
          type: "array",
        },
        priorityId: { type: "string" },
        projectId: { type: "string" },
        relations: {
          description: "Array of related note IDs.",
          items: { type: "string" },
          type: "array",
        },
        stageId: { type: "string" },
        tags: {
          items: { type: "string" },
          type: "array",
        },
        title: { type: "string" },
        urls: {
          description:
            "Array of external URLs. Each object needs 'title' and 'url'.",
          items: {
            properties: {
              title: { type: "string" },
              url: { type: "string" },
            },
            required: ["title", "url"],
            type: "object",
          },
          type: "array",
        },
      },
      required: ["title"],
      type: "object",
    },
  },
  search_projects: {
    category: FunctionCategory.PROJECTS,
    description:
      "Search for projects by title or description to find project IDs, stage IDs, and priority IDs.",
    name: "search_projects",
    parameters: {
      additionalProperties: false,
      properties: {
        searchTerm: {
          description: "Search query for the project.",
          type: "string",
        },
      },
      required: ["searchTerm"],
      type: "object",
    },
  },
  search_users: {
    category: FunctionCategory.USERS,
    description:
      "Search for users in the organization by name, username, or email to get their user IDs. Essential for resolving names to collaborator IDs.",
    name: "search_users",
    parameters: {
      additionalProperties: false,
      properties: {
        searchTerm: {
          description: "Name, username, or email of the user to search.",
          type: "string",
        },
      },
      required: ["searchTerm"],
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
      "Update an existing note body. ALWAYS use the 'blocks' parameter with structured blocks for rich formatting.",
    name: "update_note_content",
    parameters: {
      additionalProperties: false,
      properties: {
        blocks: BLOCKS_SCHEMA,
        content: {
          description:
            "Fallback plain text content. Avoid using this; prefer 'blocks' for structured formatting.",
          type: "string",
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
