const schemas = [
  {
    name: "list_note_comments",
    description:
      "Lists all comments on a specific note or task, ordered from oldest to newest. Returns each comment's ID, author info (name, username, avatar), content text, and timestamps. The user must own or collaborate on the note.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description:
            "The internal UUID of the note/task to list comments for.",
        },
      },
      required: ["noteId"],
    },
  },
  {
    name: "create_note_comment",
    description:
      "Creates a new comment on a note or task. The user must own or collaborate on the note. The comment text will be stored in TipTap format. Optionally, a parent comment ID can be provided to create a threaded reply.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The internal UUID of the note/task to comment on.",
        },
        text: {
          type: "string",
          description: "The plain text content of the comment.",
        },
        parentId: {
          type: "string",
          description:
            "Optional UUID of a parent comment to reply to (threaded comments).",
        },
      },
      required: ["noteId", "text"],
    },
  },
  {
    name: "update_note_comment",
    description:
      "Updates the text content of an existing comment. Only the comment's original author can update it.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description:
            "The internal UUID of the note that contains the comment.",
        },
        commentId: {
          type: "string",
          description: "The UUID of the comment to update.",
        },
        text: {
          type: "string",
          description: "The new plain text content for the comment.",
        },
      },
      required: ["noteId", "commentId", "text"],
    },
  },
  {
    name: "delete_note_comment",
    description:
      "Permanently removes (soft-deletes) a comment from a note. Only the comment's original author can delete it.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description:
            "The internal UUID of the note that contains the comment.",
        },
        commentId: {
          type: "string",
          description: "The UUID of the comment to delete.",
        },
      },
      required: ["noteId", "commentId"],
    },
  },
];

module.exports = { schemas };
