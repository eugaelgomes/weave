/**
 * @module weave-engine/modules/core/tools/schemas/note.schema
 * @description JSON Schema definition for the note.schema AI tool.
 */
const { z } = require("zod");

const getNoteDetailsZodSchema = z.object({
  noteId: z
    .string()
    .describe(
      "The UUID or public ID (public_note_id) of the note/task to retrieve."
    ),
});

const readNoteContentZodSchema = z.object({
  noteId: z
    .string()
    .describe(
      "The UUID or public ID (public_note_id) of the note/task to read content from."
    ),
});

const listMyNotesZodSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of notes to return. Default 10, max 50."),
  orderBy: z
    .enum(["updated_at", "created_at", "due_date"])
    .optional()
    .describe("Field to order by. Defaults to updated_at."),
  orderDirection: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Order direction. Defaults to desc."),
  projectId: z
    .string()
    .optional()
    .describe("Filter by specific project UUID or public_project_id."),
  status: z
    .string()
    .optional()
    .describe("Filter by exact status (e.g., 'OPEN', 'IN_PROGRESS', 'DONE')."),
});

const createCompleteNoteZodSchema = z.object({
  description: z.string().optional().describe("Description of the note."),
  initialBlockContent: z
    .string()
    .optional()
    .describe("Initial markdown or text content for the note."),
  project_id: z
    .string()
    .optional()
    .describe("UUID of the project this note belongs to, if any."),
  status: z
    .enum(["VISIBLE", "SECURE", "ARCHIVED"])
    .optional()
    .describe("Status of the note. Defaults to VISIBLE."),
  tags: z.array(z.string()).optional().describe("Array of tag IDs."),
  title: z.string().describe("Title of the note."),
});

const updateNoteZodSchema = z.object({
  deleted: z.boolean().optional().describe("Set to true to delete the note."),
  description: z.string().optional().describe("New description of the note."),
  noteId: z
    .string()
    .describe("The UUID or public ID (public_note_id) of the note to update."),
  project_id: z
    .string()
    .optional()
    .describe("New UUID of the project this note belongs to."),
  status: z
    .enum(["VISIBLE", "SECURE", "ARCHIVED"])
    .optional()
    .describe("New status of the note."),
  tags: z.array(z.string()).optional().describe("New array of tag IDs."),
  title: z.string().optional().describe("New title of the note."),
});

const createNoteBlockZodSchema = z.object({
  noteId: z
    .string()
    .describe("The UUID or public ID (public_note_id) of the note."),
  parent_id: z
    .string()
    .optional()
    .describe("The UUID of the parent block, if nested (e.g. inside a list)."),
  properties: z
    .record(z.any())
    .optional()
    .describe("Additional properties for the block (e.g. url for image)."),
  text: z.string().optional().describe("Text content of the block."),
  type: z
    .enum([
      "paragraph",
      "heading",
      "quote",
      "code",
      "divider",
      "image",
      "video",
      "list",
      "todo",
      "table",
      "page",
    ])
    .describe("Type of the block."),
});

const updateNoteBlockZodSchema = z.object({
  blockId: z.string().describe("The UUID of the block to update."),
  noteId: z
    .string()
    .describe("The UUID or public ID (public_note_id) of the note."),
  properties: z
    .record(z.any())
    .optional()
    .describe("New additional properties."),
  text: z.string().optional().describe("New text content of the block."),
  type: z
    .enum([
      "paragraph",
      "heading",
      "quote",
      "code",
      "divider",
      "image",
      "video",
      "list",
      "todo",
      "table",
      "page",
    ])
    .optional()
    .describe("New type of the block."),
});

const deleteNoteBlockZodSchema = z.object({
  blockId: z.string().describe("The UUID of the block to delete."),
  noteId: z
    .string()
    .describe("The UUID or public ID (public_note_id) of the note."),
});

const reorderNoteBlocksZodSchema = z.object({
  noteId: z
    .string()
    .describe("The UUID or public ID (public_note_id) of the note."),
  ordered_ids: z
    .array(z.string())
    .describe("Array of block UUIDs in the new order."),
  parent_id: z
    .string()
    .optional()
    .describe("The UUID of the parent block, if any."),
});

const getNoteCollaboratorsZodSchema = z.object({
  noteId: z
    .string()
    .describe("The UUID or public ID (public_note_id) of the note."),
});

const addNoteCollaboratorZodSchema = z.object({
  collaboratorUserId: z
    .string()
    .describe("The UUID of the user to add as a collaborator."),
  noteId: z
    .string()
    .describe("The UUID or public ID (public_note_id) of the note."),
});

const createTaskInStageZodSchema = z.object({
  description: z.string().optional().describe("Description of the task."),
  due_date: z.string().optional().describe("Due date in ISO format."),
  initialBlockContent: z
    .string()
    .optional()
    .describe("Initial content for the task."),
  priority_id: z.string().optional().describe("UUID of the task priority."),
  project_id: z.string().describe("UUID of the project this task belongs to."),
  project_stage_id: z
    .string()
    .optional()
    .describe("UUID of the project stage (column) this task belongs to."),
  title: z.string().describe("Title of the task."),
});

const updateTaskInProjectZodSchema = z.object({
  description: z.string().optional().describe("New description of the task."),
  due_date: z.string().optional().describe("New due date in ISO format."),
  noteId: z.string().describe("The UUID or public ID of the task."),
  priority_id: z.string().optional().describe("New UUID of the task priority."),
  project_id: z.string().optional().describe("New UUID of the project."),
  project_stage_id: z
    .string()
    .optional()
    .describe("New UUID of the project stage (column)."),
  status: z
    .enum(["VISIBLE", "SECURE", "ARCHIVED"])
    .optional()
    .describe("Status of the task."),
  title: z.string().optional().describe("New title of the task."),
});

const schemas = [
  {
    description:
      "Fetches the header/metadata of a specific note or task the user owns or collaborates on. Returns title, status, due date, priority, tags (resolved with name and color), attached files, relations, URLs, collaborators, and the associated project. Does NOT return the full content blocks — use read_note_content to read the actual note content blocks. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "get_note_details",
    parameters: getNoteDetailsZodSchema.toJSONSchema(),
  },
  {
    description:
      "Reads the full content blocks of a specific note or task. Use this when you need to understand the exact subject, context, or inner details of a task beyond its title and description. Returns an array of block objects.",
    name: "read_note_content",
    parameters: readNoteContentZodSchema.toJSONSchema(),
  },
  {
    description:
      "Fetches a list of the user's notes/tasks based on structured database filters like limit, sorting (e.g., most recent), status, and project. ALWAYS prioritize using this tool over search_my_notes when the user asks for 'latest', 'recent', chronological lists, or asks to see tasks of a specific project/status. Semantic search is bad for chronological filtering. Returns metadata, but not full content blocks.",
    name: "list_my_notes",
    parameters: listMyNotesZodSchema.toJSONSchema(),
  },
  {
    description: "Creates a new note with an optional initial text block.",
    name: "create_complete_note",
    parameters: createCompleteNoteZodSchema.toJSONSchema(),
  },
  {
    description:
      "Updates a note's title, description, status, project, tags, etc.",
    name: "update_note",
    parameters: updateNoteZodSchema.toJSONSchema(),
  },
  {
    description:
      "Creates a new content block inside a note (e.g. paragraph, list item, todo).",
    name: "create_note_block",
    parameters: createNoteBlockZodSchema.toJSONSchema(),
  },
  {
    description:
      "Updates an existing content block's text or properties in a note.",
    name: "update_note_block",
    parameters: updateNoteBlockZodSchema.toJSONSchema(),
  },
  {
    description: "Deletes a content block from a note.",
    name: "delete_note_block",
    parameters: deleteNoteBlockZodSchema.toJSONSchema(),
  },
  {
    description: "Reorders blocks within a specific parent in a note.",
    name: "reorder_note_blocks",
    parameters: reorderNoteBlocksZodSchema.toJSONSchema(),
  },
  {
    description: "Lists all collaborators for a specific note.",
    name: "get_note_collaborators",
    parameters: getNoteCollaboratorsZodSchema.toJSONSchema(),
  },
  {
    description: "Adds a user as a collaborator to a note.",
    name: "add_note_collaborator",
    parameters: addNoteCollaboratorZodSchema.toJSONSchema(),
  },
  {
    description:
      "Creates a task in a specific project and stage. A task is essentially a Note attached to a project.",
    name: "create_task_in_stage",
    parameters: createTaskInStageZodSchema.toJSONSchema(),
  },
  {
    description:
      "Updates a task's details including its stage (column), priority, and due date.",
    name: "update_task_in_project",
    parameters: updateTaskInProjectZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  add_note_collaborator: addNoteCollaboratorZodSchema,
  create_complete_note: createCompleteNoteZodSchema,
  create_note_block: createNoteBlockZodSchema,
  create_task_in_stage: createTaskInStageZodSchema,
  delete_note_block: deleteNoteBlockZodSchema,
  get_note_collaborators: getNoteCollaboratorsZodSchema,
  get_note_details: getNoteDetailsZodSchema,
  list_my_notes: listMyNotesZodSchema,
  read_note_content: readNoteContentZodSchema,
  reorder_note_blocks: reorderNoteBlocksZodSchema,
  update_note: updateNoteZodSchema,
  update_note_block: updateNoteBlockZodSchema,
  update_task_in_project: updateTaskInProjectZodSchema,
};

module.exports = { schemas, zodSchemas };
