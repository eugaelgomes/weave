/**
 * @module weave-engine/modules/core/tools/schemas/note-comments.schema
 * @description JSON Schema definition for the note-comments.schema AI tool.
 */
const { z } = require("zod");

const listNoteCommentsZodSchema = z.object({
  noteId: z
    .string()
    .describe("The internal UUID of the note/task to list comments for."),
});

const createNoteCommentZodSchema = z.object({
  noteId: z
    .string()
    .describe("The internal UUID of the note/task to comment on."),
  parentId: z
    .string()
    .optional()
    .describe(
      "Optional UUID of a parent comment to reply to (threaded comments)."
    ),
  text: z.string().describe("The plain text content of the comment."),
});

const updateNoteCommentZodSchema = z.object({
  commentId: z.string().describe("The UUID of the comment to update."),
  noteId: z
    .string()
    .describe("The internal UUID of the note/task that contains the comment."),
  text: z.string().describe("The new plain text content for the comment."),
});

const deleteNoteCommentZodSchema = z.object({
  commentId: z.string().describe("The UUID of the comment to delete."),
  noteId: z
    .string()
    .describe("The internal UUID of the note/task that contains the comment."),
});

const schemas = [
  {
    description:
      "Lists all comments on a specific note or task, ordered from oldest to newest. Returns each comment's ID, author info (name, username, avatar), content text, and timestamps. The user must own or collaborate on the note. (Important: Translate any enum values returned by the database to the user's language.)",
    name: "list_note_comments",
    parameters: listNoteCommentsZodSchema.toJSONSchema(),
  },
  {
    description:
      "Creates a new comment on a note or task. The user must own or collaborate on the note. The comment text will be stored in TipTap format. Optionally, a parent comment ID can be provided to create a threaded reply.",
    name: "create_note_comment",
    parameters: createNoteCommentZodSchema.toJSONSchema(),
  },
  {
    description:
      "Updates the text content of an existing comment. Only the comment's original author can update it.",
    name: "update_note_comment",
    parameters: updateNoteCommentZodSchema.toJSONSchema(),
  },
  {
    description:
      "Permanently removes (soft-deletes) a comment from a note/task. Only the comment's original author can delete it.",
    name: "delete_note_comment",
    parameters: deleteNoteCommentZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  create_note_comment: createNoteCommentZodSchema,
  delete_note_comment: deleteNoteCommentZodSchema,
  list_note_comments: listNoteCommentsZodSchema,
  update_note_comment: updateNoteCommentZodSchema,
};

module.exports = { schemas, zodSchemas };
