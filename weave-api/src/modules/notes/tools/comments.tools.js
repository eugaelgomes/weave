const { manageNoteCommentsSchema } = require("../schemas/tools.schema");
const { NotesCommentsService } = require("../services/notes-comments.service");
const notesCommentsRepository = require("@/modules/notes/repositories/notes-comments.repository");

const createCommentsTools = (user) => ({
  manage_note_comments: {
    description: "Manage note comments (create, update, delete, list).",
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const { action, noteId, commentId, content } = args;

        if (action === "create") {
          if (!noteId || !content) {
            throw new Error(
              "noteId and content are required for create action."
            );
          }
          const newComment = await NotesCommentsService.createComment(
            userId,
            noteId,
            {
              content: {
                content: [
                  {
                    content: [{ text: content, type: "text" }],
                    type: "paragraph",
                  },
                ],
                type: "doc",
              },
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
          if (!commentId || !content) {
            throw new Error(
              "commentId and content are required for update action."
            );
          }
          const existing = await notesCommentsRepository.getById(commentId);
          if (!existing) throw new Error("Comment not found.");

          await NotesCommentsService.updateComment(
            userId,
            String(existing.note_id),
            commentId,
            {
              content: {
                content: [
                  {
                    content: [{ text: content, type: "text" }],
                    type: "paragraph",
                  },
                ],
                type: "doc",
              },
            }
          );
          return {
            content: [{ text: `Comment updated successfully.`, type: "text" }],
          };
        }

        if (action === "delete") {
          if (!commentId) {
            throw new Error("commentId is required for delete action.");
          }
          const existing = await notesCommentsRepository.getById(commentId);
          if (!existing) throw new Error("Comment not found.");

          await NotesCommentsService.deleteComment(
            userId,
            String(existing.note_id),
            commentId
          );
          return {
            content: [
              {
                text: `Comment ${commentId} deleted successfully.`,
                type: "text",
              },
            ],
          };
        }

        if (action === "list") {
          if (!noteId) throw new Error("noteId is required for list action.");
          const comments = await NotesCommentsService.listComments(
            userId,
            noteId
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
