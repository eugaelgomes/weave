const { z } = require("zod");
const { uuidSchema } = require("@/utils/mcp-schemas.util");

// ==========================================
// manage_notes
// ==========================================
const manageNotesSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    project_id: uuidSchema.optional().describe("ID of the associated project"),
    status: z
      .string()
      .optional()
      .describe("Status of the note (VISIBLE, SECURE, ARCHIVED)"),
    tags: z.array(z.string()).optional().describe("Array of tags"),
    title: z.string().describe("Title of the note"),
  }),
  z.object({
    action: z.literal("update"),
    note_id: z
      .string()
      .describe(
        "ID of the note to update (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
      ),
    status: z.string().optional().describe("New status"),
    tags: z.array(z.string()).optional().describe("New tags"),
    title: z.string().optional().describe("New title"),
  }),
  z.object({
    action: z.literal("delete"),
    note_id: z
      .string()
      .describe(
        "ID of the note to delete (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
      ),
  }),
  z.object({
    action: z.literal("get"),
    note_id: z
      .string()
      .describe(
        "ID of the note to retrieve (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
      ),
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
    sort_by: z
      .enum(["updated_at", "created_at", "title"])
      .optional()
      .describe("Field to sort by"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  }),
]);

// ==========================================
// manage_note_blocks
// ==========================================

/** Block type enum — use one of these exact strings for the `type` field. */
const blockTypeSchema = z
  .enum([
    "heading",
    "paragraph",
    "code",
    "list",
    "todo",
    "image",
    "video",
    "quote",
    "divider",
  ])
  .describe(
    "Type of the block. Allowed values: heading, paragraph, code, list, todo, image, video, quote, divider."
  );

const blockAttrsSchema = z.object({
  alt: z
    .string()
    .optional()
    .describe("Alternative text. Allowed for image blocks."),
  background_color: z
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
      .describe("Block-specific attributes mapped by type."),
    level: z
      .number()
      .optional()
      .describe("Legacy heading level (deprecated, prefer attrs.level)."),
    marks: z
      .array(markSchema)
      .optional()
      .describe(
        "Text formatting marks. Example: [{type:'bold',start:0,end:5},{type:'link',start:6,end:11,attrs:{href:'https://example.com'}}]"
      ),
    text: z.string().optional().describe("Text content within properties."),
  })
  .catchall(z.unknown())
  .describe(
    "Block properties containing text, formatting marks and block-specific attrs. Example for a heading: {text:'Introduction',attrs:{level:2,background_color:'#f0f0f0'}}"
  );

const manageNoteBlocksSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    blocks: z
      .array(
        z.object({
          parent_id: z
            .string()
            .optional()
            .nullable()
            .describe("Optional parent block ID for nesting"),
          position: z
            .number()
            .optional()
            .describe("Position among siblings (0-indexed)"),
          properties: blockPropertiesSchema.optional(),
          text: z
            .string()
            .optional()
            .describe("Shorthand text content for the block"),
          type: blockTypeSchema,
        })
      )
      .optional()
      .describe(
        "Array of blocks to create multiple at once. Ignores single block fields if provided."
      ),
    note_id: z
      .string()
      .describe(
        "ID of the note to add the block to (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
      ),
    parent_id: z
      .string()
      .optional()
      .nullable()
      .describe("Optional parent block ID for nesting"),
    position: z
      .number()
      .optional()
      .describe("Position among siblings (0-indexed)"),
    properties: blockPropertiesSchema.optional(),
    text: z
      .string()
      .optional()
      .describe("Shorthand text content for the block"),
    type: blockTypeSchema.optional(),
  }),
  z.object({
    action: z.literal("update"),
    block_id: z
      .union([uuidSchema, z.array(uuidSchema)])
      .describe("ID or array of IDs of the block(s) to update"),
    position: z.number().optional().describe("New position among siblings"),
    properties: blockPropertiesSchema.optional(),
    text: z.string().optional().describe("Updated text content"),
    type: blockTypeSchema.optional(),
  }),
  z.object({
    action: z.literal("delete"),
    block_id: z
      .union([uuidSchema, z.array(uuidSchema)])
      .describe("ID or array of IDs of the block(s) to delete"),
  }),
  z.object({
    action: z.literal("list"),
    note_id: z
      .string()
      .describe(
        "ID of the note whose blocks to list (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
      ),
  }),
]);

// ==========================================
// manage_note_collaborators
// ==========================================
const manageNoteCollaboratorsSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("add"),
      note_id: z
        .string()
        .describe(
          "ID of the note (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
        ),
      user_id: uuidSchema.describe("ID of the user to add as a collaborator"),
    })
    .describe("Action to add a new collaborator to the note"),
  z
    .object({
      action: z.literal("remove"),
      note_id: z
        .string()
        .describe(
          "ID of the note (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
        ),
      user_id: uuidSchema.describe("ID of the user to remove"),
    })
    .describe("Action to remove an existing collaborator from the note"),
  z
    .object({
      action: z.literal("list"),
      note_id: z
        .string()
        .describe(
          "ID of the note (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
        ),
    })
    .describe("Action to list all collaborators of the note"),
]);

// ==========================================
// manage_note_comments
// ==========================================
const manageNoteCommentsSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("create"),
      content: z
        .union([z.string(), z.record(z.any())])
        .describe(
          "Content of the comment (plain text string or block structure object for rich text)"
        ),
      note_id: z
        .string()
        .describe(
          "ID of the note (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
        ),
      parent_id: z
        .string()
        .optional()
        .nullable()
        .describe("Optional ID of the parent comment for threaded replies"),
    })
    .describe("Action to create a new comment on a note"),
  z
    .object({
      action: z.literal("update"),
      comment_id: uuidSchema.describe("ID of the comment to update"),
      content: z
        .union([z.string(), z.record(z.any())])
        .describe(
          "New content for the comment (plain text string or block structure object)"
        ),
    })
    .describe("Action to update an existing comment"),
  z
    .object({
      action: z.literal("delete"),
      comment_id: uuidSchema.describe("ID of the comment to delete"),
    })
    .describe("Action to delete a comment"),
  z
    .object({
      action: z.literal("list"),
      note_id: z
        .string()
        .describe(
          "ID of the note (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
        ),
    })
    .describe("Action to list all comments for a note"),
]);

module.exports = {
  manageNoteBlocksSchema,
  manageNoteCollaboratorsSchema,
  manageNoteCommentsSchema,
  manageNotesSchema,
};
