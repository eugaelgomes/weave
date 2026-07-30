const { manageNoteCommentsSchema } = require("../schemas/tools.schema");
const { NotesCommentsService } = require("../services/notes-comments.service");
const notesCommentsRepository = require("@/modules/notes/repositories/notes-comments.repository");

const createCommentsTools = (user) => ({
  manage_note_comments: {
    description: `Manage Weave Note Comments (create, update, delete, list).

FUNCTIONALITIES (Actions):
1. 'create': Posts a new comment on a note.
   - How to use: Provide 'action' as "create", the 'note_id', and the 'content' (can be a plain string OR a ProseMirror JSON doc for rich text). Optionally provide 'parent_id' to reply to an existing comment.
   - What it does: Creates a new threaded comment inside the note.
2. 'update': Modifies an existing comment.
   - How to use: Provide 'action' as "update", the 'comment_id', and the new 'content' (string or rich text JSON).
   - What it does: Edits the text of the specified comment.
3. 'delete': Removes a comment.
   - How to use: Provide 'action' as "delete" and the 'comment_id'.
   - What it does: Deletes the comment from the note.
4. 'list': Retrieves all comments for a note.
   - How to use: Provide 'action' as "list" and the 'note_id'.
   - What it does: Returns a hierarchical structure of comments (and replies) for the note.
   
EXAMPLES (How to structure data):
- Plain text comment: 
  content = "This is a simple comment"

- Rich text comment (ProseMirror JSON):
  content = {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "This is a " },
          { "type": "text", "marks": [{ "type": "bold" }], "text": "bold" },
          { "type": "text", "text": " comment." }
        ]
      }
    ]
  }`,
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const { action, note_id, comment_id, content } = args;

        if (action === "create") {
          if (!note_id || !content) {
            throw new Error(
              "note_id and content are required for create action."
            );
          }
          const finalContent =
            typeof content === "string"
              ? {
                  content: [
                    {
                      content: [{ text: content, type: "text" }],
                      type: "paragraph",
                    },
                  ],
                  type: "doc",
                }
              : content;

          const newComment = await NotesCommentsService.createComment(
            userId,
            note_id,
            {
              content: finalContent,
              files: [],
              parentId: null,
            }
          );
          return {
            content: [
              {
                text: `Comment created successfully! ID: ${newComment.id}`,
                type: "text",
              },
            ],
          };
        }

        if (action === "update") {
          if (!comment_id || !content) {
            throw new Error(
              "comment_id and content are required for update action."
            );
          }
          const existing = await notesCommentsRepository.getById(comment_id);
          if (!existing) throw new Error("Comment not found.");

          const finalContent =
            typeof content === "string"
              ? {
                  content: [
                    {
                      content: [{ text: content, type: "text" }],
                      type: "paragraph",
                    },
                  ],
                  type: "doc",
                }
              : content;

          await NotesCommentsService.updateComment(
            userId,
            String(existing.note_id),
            comment_id,
            {
              content: finalContent,
            }
          );
          return {
            content: [{ text: `Comment updated successfully.`, type: "text" }],
          };
        }

        if (action === "delete") {
          if (!comment_id) {
            throw new Error("comment_id is required for delete action.");
          }
          const existing = await notesCommentsRepository.getById(comment_id);
          if (!existing) throw new Error("Comment not found.");

          await NotesCommentsService.deleteComment(
            userId,
            String(existing.note_id),
            comment_id
          );
          return {
            content: [
              {
                text: `Comment ${comment_id} deleted successfully.`,
                type: "text",
              },
            ],
          };
        }

        if (action === "list") {
          if (!note_id) throw new Error("note_id is required for list action.");
          const comments = await NotesCommentsService.listComments(
            userId,
            note_id
          );
          return {
            content: [
              { text: JSON.stringify(comments, null, 2), type: "text" },
            ],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error managing note comments: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_note_comments",
    schema: manageNoteCommentsSchema,
  },
});

module.exports = {
  createCommentsTools,
};
