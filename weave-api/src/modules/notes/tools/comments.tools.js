const { z } = require("zod");
const notesCommentsRepository = require("@/modules/notes/repositories/notes-comments.repository");

const manageCommentsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    content: z.string().describe("The text content of the comment"),
    noteId: z.string().describe("ID of the note"),
  }),
  z.object({
    action: z.literal("update"),
    commentId: z.string().describe("ID of the comment"),
    content: z.string().describe("The text content of the comment"),
  }),
  z.object({
    action: z.literal("delete"),
    commentId: z.string().describe("ID of the comment"),
  }),
  z.object({
    action: z.literal("list"),
    noteId: z.string().describe("ID of the note"),
  }),
]);

/**
 * Creates the Comments tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The comments tools definition map.
 */
const createCommentsTools = (user) => ({
  manage_note_comments: {
    description: "Manage note comments (create, update, delete, list).",
    handler: async (args) => {
      try {
        const { action, noteId, commentId, content } = args;

        if (action === "create") {
          if (!noteId || !content)
            throw new Error(
              "noteId and content are required for create action."
            );
          const newComment = await notesCommentsRepository.create({
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
        }

        if (action === "update") {
          if (!commentId || !content)
            throw new Error(
              "commentId and content are required for update action."
            );
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
          if (!updated)
            throw new Error(`Comment ${commentId} not found or access denied.`);
          return {
            content: [{ text: `Comment updated successfully.`, type: "text" }],
          };
        }

        if (action === "delete") {
          if (!commentId)
            throw new Error("commentId is required for delete action.");
          const success = await notesCommentsRepository.softDelete(
            commentId,
            user.userId
          );
          if (!success)
            throw new Error(`Comment ${commentId} not found or access denied.`);
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
          const comments = await notesCommentsRepository.listByNoteId(noteId);
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
    schema: manageCommentsSchema,
  },
});

module.exports = {
  createCommentsTools,
};
