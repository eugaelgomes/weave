/**
 * @module weave-engine/modules/core/tools/schemas/note-comments.schema
 * @description JSON Schema definition for the note-comments.schema AI tool.
 */
const { z } = require("zod");

const listNoteCommentsZodSchema = z.object({
  noteId: z.string().describe("The internal UUID of the note/task to list comments for."),
});

const createNoteCommentZodSchema = z.object({
  noteId: z.string().describe("The internal UUID of the note/task to comment on."),
  text: z.string().describe("The plain text content of the comment."),
  parentId: z.string().optional().describe("Optional UUID of a parent comment to reply to (threaded comments)."),
});

const updateNoteCommentZodSchema = z.object({
  noteId: z.string().describe("The internal UUID of the note/task that contains the comment."),
  commentId: z.string().describe("The UUID of the comment to update."),
  text: z.string().describe("The new plain text content for the comment."),
});

const deleteNoteCommentZodSchema = z.object({
  noteId: z.string().describe("The internal UUID of the note/task that contains the comment."),
  commentId: z.string().describe("The UUID of the comment to delete."),
});

const schemas = [
  {
    name: "list_note_comments",
    description:
      "Lists all comments on a specific note or task, ordered from oldest to newest. Returns each comment's ID, author info (name, username, avatar), content text, and timestamps. The user must own or collaborate on the note.",
    parameters: listNoteCommentsZodSchema.toJSONSchema(),
  },
  {
    name: "create_note_comment",
    description:
      "Creates a new comment on a note or task. The user must own or collaborate on the note. The comment text will be stored in TipTap format. Optionally, a parent comment ID can be provided to create a threaded reply.",
    parameters: createNoteCommentZodSchema.toJSONSchema(),
  },
  {
    name: "update_note_comment",
    description:
      "Updates the text content of an existing comment. Only the comment's original author can update it.",
    parameters: updateNoteCommentZodSchema.toJSONSchema(),
  },
  {
    name: "delete_note_comment",
    description:
      "Permanently removes (soft-deletes) a comment from a note/task. Only the comment's original author can delete it.",
    parameters: deleteNoteCommentZodSchema.toJSONSchema(),
  },
];

const zodSchemas = {
  list_note_comments: listNoteCommentsZodSchema,
  create_note_comment: createNoteCommentZodSchema,
  update_note_comment: updateNoteCommentZodSchema,
  delete_note_comment: deleteNoteCommentZodSchema,
};

module.exports = { schemas, zodSchemas };
