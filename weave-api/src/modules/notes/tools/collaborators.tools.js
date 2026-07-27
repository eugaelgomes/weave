const { z } = require("zod");
const noteCollaboratorsRepository = require("@/modules/notes/repositories/note-collaborators.repository");
const readNotesRepository = require("@/modules/notes/repositories/read-notes.repository");

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

/**
 * Creates the Note Collaborators tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The collaborators tools definition map.
 */
const createNoteCollaboratorsTools = (user) => ({
  manage_note_collaborators: {
    description: "Manage note collaborators (add, remove, list).",
    handler: async (args) => {
      try {
        const { action, noteId, userId } = args;

        // Security check
        const accessSummary =
          await readNotesRepository.getNoteAccessSummary(noteId);
        if (!accessSummary || accessSummary.user_id !== user.userId) {
          throw new Error(`Note ${noteId} not found or access denied.`);
        }

        if (action === "add") {
          if (!userId) throw new Error("userId is required for add action.");
          const added = await noteCollaboratorsRepository.addCollaborator(
            noteId,
            userId
          );
          return {
            content: [{ text: JSON.stringify(added, null, 2), type: "text" }],
          };
        }

        if (action === "remove") {
          if (!userId) throw new Error("userId is required for remove action.");
          await noteCollaboratorsRepository.removeCollaborator(
            noteId,
            userId,
            user.userId
          );
          return {
            content: [
              { text: `Successfully removed collaborator.`, type: "text" },
            ],
          };
        }

        if (action === "list") {
          const collabs =
            await noteCollaboratorsRepository.getCollaboratorsByNoteId(noteId);
          return {
            content: [{ text: JSON.stringify(collabs, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error managing note collaborators: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_note_collaborators",
    schema: manageNoteCollaboratorsSchema,
  },
});

module.exports = {
  createNoteCollaboratorsTools,
};
