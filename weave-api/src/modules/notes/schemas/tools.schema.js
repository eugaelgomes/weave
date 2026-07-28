const { z } = require("zod");

// ==========================================
// manage_notes
// ==========================================
const manageNotesSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    description: z
      .string()
      .optional()
      .describe("Content/description of the note"),
    projectId: z.string().optional().describe("ID of the associated project"),
    status: z
      .string()
      .optional()
      .describe("Status of the note (VISIBLE, SECURE, ARCHIVED)"),
    tags: z.array(z.string()).optional().describe("Array of tags"),
    title: z.string().describe("Title of the note"),
  }),
  z.object({
    action: z.literal("update"),
    description: z.string().optional().describe("New description"),
    noteId: z.string().describe("ID of the note to update"),
    status: z.string().optional().describe("New status"),
    tags: z.array(z.string()).optional().describe("New tags"),
    title: z.string().optional().describe("New title"),
  }),
  z.object({
    action: z.literal("delete"),
    noteId: z.string().describe("ID of the note to delete"),
  }),
  z.object({
    action: z.literal("get"),
    noteId: z.string().describe("ID of the note to retrieve"),
  }),
  z.object({
    action: z.literal("list"),
    limit: z
      .number()
      .optional()
      .describe("Number of notes to return (default: 10)"),
    page: z
      .number()
      .optional()
      .describe("Page number for pagination (default: 1)"),
    search: z.string().optional().describe("Search term to filter notes"),
    sortBy: z
      .enum(["updated_at", "created_at", "title"])
      .optional()
      .describe("Field to sort by"),
    sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  }),
]);

// ==========================================
// manage_note_blocks
// ==========================================
const blockAttrsSchema = z.object({
  alt: z
    .string()
    .optional()
    .describe("Alternative text. Allowed for image blocks."),
  backgroundColor: z
    .string()
    .optional()
    .describe(
      "Background hex color from the palette. Allowed for heading, paragraph, quote, list, todo blocks."
    ),
  checked: z
    .boolean()
    .optional()
    .describe("Whether the todo is checked. Allowed for todo blocks."),
  language: z
    .string()
    .optional()
    .describe("Programming language string. Allowed for code blocks."),
  level: z
    .number()
    .min(1)
    .max(6)
    .optional()
    .describe("Heading level (1-6). Required for heading blocks."),
  ordered: z
    .boolean()
    .optional()
    .describe("Whether the list is ordered. Allowed for list blocks."),
  src: z
    .string()
    .optional()
    .describe(
      "URL of the image or video. Required for image and video blocks."
    ),
  title: z
    .string()
    .optional()
    .describe("Title text. Allowed for image and video blocks."),
});

const markAttrsSchema = z.object({
  class: z.string().optional().describe("CSS class name for the mark."),
  color: z
    .string()
    .optional()
    .describe(
      "Hex color string from the palette. Allowed for textStyle and highlight marks."
    ),
  href: z.string().optional().describe("Target URL. Required for link marks."),
  rel: z
    .string()
    .optional()
    .describe("Link rel attribute. Allowed for link marks."),
  target: z
    .string()
    .optional()
    .describe("Link target. Allowed for link marks."),
  title: z
    .string()
    .nullable()
    .optional()
    .describe("Link title. Allowed for link marks."),
});

const markSchema = z.object({
  attrs: markAttrsSchema
    .optional()
    .describe("Specific attributes for the mark."),
  end: z.number().describe("End index of the mark."),
  start: z.number().describe("Start index of the mark."),
  type: z
    .enum([
      "bold",
      "code",
      "highlight",
      "italic",
      "link",
      "strike",
      "subscript",
      "superscript",
      "textStyle",
      "underline",
    ])
    .describe("Exact type of the formatting mark."),
});

const blockPropertiesSchema = z
  .object({
    attrs: blockAttrsSchema
      .optional()
      .describe("Block specific attributes mapped by type."),
    level: z.number().optional().describe("Legacy heading level duplication."),
    marks: z
      .array(markSchema)
      .optional()
      .describe("Text formatting marks definitions."),
    text: z.string().optional().describe("Text content within properties."),
  })
  .catchall(z.unknown())
  .describe("Block properties containing formatting marks and specific attrs");

const manageNoteBlocksSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    noteId: z.string().describe("ID of the note"),
    parentId: z
      .string()
      .optional()
      .nullable()
      .describe("Optional parent block ID"),
    position: z.number().optional().describe("Position among siblings"),
    properties: blockPropertiesSchema.optional(),
    text: z.string().optional().describe("Text content for the block"),
    type: z.string().describe("Block type"),
  }),
  z.object({
    action: z.literal("update"),
    blockId: z
      .union([z.string(), z.array(z.string())])
      .describe("ID(s) of the block(s)"),
    position: z.number().optional().describe("Position among siblings"),
    properties: blockPropertiesSchema.optional(),
    text: z.string().optional().describe("Text content for the block"),
    type: z.string().optional().describe("Block type"),
  }),
  z.object({
    action: z.literal("delete"),
    blockId: z
      .union([z.string(), z.array(z.string())])
      .describe("ID(s) of the block(s)"),
  }),
  z.object({
    action: z.literal("list"),
    noteId: z.string().describe("ID of the note"),
  }),
]);

// ==========================================
// manage_note_collaborators
// ==========================================
const manageNoteCollaboratorsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    noteId: z.string().describe("ID of the note"),
    userId: z.string().describe("ID of the user to add as a collaborator"),
  }),
  z.object({
    action: z.literal("remove"),
    noteId: z.string().describe("ID of the note"),
    userId: z.string().describe("ID of the user to remove"),
  }),
  z.object({
    action: z.literal("list"),
    noteId: z.string().describe("ID of the note"),
  }),
]);

// ==========================================
// manage_note_comments
// ==========================================
const manageNoteCommentsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    content: z.string().describe("Content of the comment"),
    noteId: z.string().describe("ID of the note"),
    parentId: z
      .string()
      .optional()
      .nullable()
      .describe("Optional ID of the parent comment"),
  }),
  z.object({
    action: z.literal("update"),
    commentId: z.string().describe("ID of the comment to update"),
    content: z.string().describe("New content for the comment"),
  }),
  z.object({
    action: z.literal("delete"),
    commentId: z.string().describe("ID of the comment to delete"),
  }),
  z.object({
    action: z.literal("list"),
    noteId: z.string().describe("ID of the note"),
  }),
]);

module.exports = {
  manageNoteBlocksSchema,
  manageNoteCollaboratorsSchema,
  manageNoteCommentsSchema,
  manageNotesSchema,
};
