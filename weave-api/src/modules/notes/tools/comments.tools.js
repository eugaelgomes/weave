const { z } = require("zod");
const notesCommentsRepository = require("@/modules/notes/repositories/notes-comments.repository");

const listCommentsSchema = z.object({
  noteId: z.string().describe("ID of the note to retrieve comments for"),
});

const createCommentSchema = z.object({
  content: z.string().describe("The text content of the comment"),
  noteId: z.string().describe("ID of the note to add the comment to"),
});

const updateCommentSchema = z.object({
  commentId: z.string().describe("ID of the comment to update"),
  content: z.string().describe("The new text content for the comment"),
});

const deleteCommentSchema = z.object({
  commentId: z.string().describe("ID of the comment to delete"),
});

/**
 * Creates the Comments tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The comments tools definition map.
 */
const createCommentsTools = (user) => ({
  create_comment: {
    description: "Adds a new comment text to a note.",
    handler: async (args) => {
      try {
        const { noteId, content } = args;
        const newComment = await notesCommentsRepository.create({
          content: {
            content: [
              { content: [{ text: content, type: "text" }], type: "paragraph" },
            ],
            type: "doc",
          },
          files: [],
          noteId,
          orgId: user.organizationId,
          parentId: null,
          userId: user.userId,
        });
        return {
          content: [
            {
              text: `Comment created successfully! ID: ${newComment.id}`,
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error creating comment: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "create_comment",
    schema: createCommentSchema,
  },
  delete_comment: {
    description: "Deletes a comment.",
    handler: async (args) => {
      try {
        const { commentId } = args;
        const success = await notesCommentsRepository.softDelete(
          commentId,
          user.userId
        );
        if (!success) {
          return {
            content: [
              {
                text: `Comment ${commentId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              text: `Comment ${commentId} deleted successfully.`,
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error deleting comment: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "delete_comment",
    schema: deleteCommentSchema,
  },
  list_comments: {
    description: "Retrieves comments for a specific note.",
    handler: async (args) => {
      try {
        const comments = await notesCommentsRepository.listByNoteId(
          args.noteId
        );
        return {
          content: [{ text: JSON.stringify(comments, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error listing comments: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "list_comments",
    schema: listCommentsSchema,
  },
  update_comment: {
    description: "Modifies an existing comment.",
    handler: async (args) => {
      try {
        const { commentId, content } = args;
        const updated = await notesCommentsRepository.update(
          commentId,
          user.userId,
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
        if (!updated) {
          return {
            content: [
              {
                text: `Comment ${commentId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              text: `Comment ${commentId} updated successfully!`,
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error updating comment: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "update_comment",
    schema: updateCommentSchema,
  },
});

module.exports = {
  createCommentsTools,
};
