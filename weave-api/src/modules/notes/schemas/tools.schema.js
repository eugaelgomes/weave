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
  z.object({
    action: z.literal("upload_file"),
    base64_data: z.string().describe("Base64 encoded string of the file content"),
    file_name: z.string().optional().describe("Original file name"),
    is_image: z.boolean().optional().describe("Whether this file should be treated as a document image (vs general attachment)"),
    mime_type: z.string().describe("MIME type of the file (e.g., image/png, application/pdf)"),
    note_id: z.string().describe("ID of the note (Internal UUID or public_note_id)"),
  }),
  z.object({
    action: z.literal("read_file"),
    url: z.string().describe("The public URL of the file to read/download"),
  }),
  z.object({
    action: z.literal("delete_file"),
    url: z.string().describe("The public URL of the file to delete"),
  })
]);

// ==========================================
// manage_note_blocks
// ==========================================

const manageNoteBlocksSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("read"),
    note_id: z
      .string()
      .describe(
        "ID of the note whose content to read as Markdown (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
      ),
  }),
  z.object({
    action: z.literal("update"),
    markdown: z
      .string()
      .describe("The full updated markdown content that will COMPLETELY REPLACE the current note content"),
    note_id: z
      .string()
      .describe(
        "ID of the note to completely update (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
      ),
  }),
  z.object({
    action: z.literal("create"),
    markdown: z
      .string()
      .describe("Markdown content to append to the end of the note"),
    note_id: z
      .string()
      .describe(
        "ID of the note to add the content to (Internal UUID or public_note_id). CRITICAL: Always use public_note_id to construct URLs or show IDs to the user."
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
  z.object({
    action: z.literal("upload_file"),
    base64_data: z.string().describe("Base64 encoded string of the file content"),
    file_name: z.string().optional().describe("Original file name"),
    mime_type: z.string().describe("MIME type of the file (e.g., image/png, application/pdf)"),
    note_id: z.string().describe("ID of the note (Internal UUID or public_note_id)"),
  }).describe("Action to upload a file to a comment"),
  z.object({
    action: z.literal("read_file"),
    url: z.string().describe("The public URL of the file to read/download"),
  }).describe("Action to read a comment file"),
  z.object({
    action: z.literal("delete_file"),
    url: z.string().describe("The public URL of the file to delete"),
  }).describe("Action to delete a comment file"),
]);

module.exports = {
  manageNoteBlocksSchema,
  manageNoteCollaboratorsSchema,
  manageNoteCommentsSchema,
  manageNotesSchema,
};
