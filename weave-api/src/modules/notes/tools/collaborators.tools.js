const { manageNoteCollaboratorsSchema } = require("../schemas/tools.schema");
const {
  NotesCollaboratorsService,
} = require("../services/notes-collaborators.service");

const createNoteCollaboratorsTools = (user) => ({
  manage_note_collaborators: {
    description: "Manage note collaborators (add, remove, list).",
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const { action, noteId, userId: targetUserId } = args;

        if (action === "add") {
          if (!targetUserId)
            throw new Error("userId is required for add action.");
          const added = await NotesCollaboratorsService.addCollaborator(
            userId,
            noteId,
            targetUserId
          );
          return {
            content: [{ text: JSON.stringify(added, null, 2), type: "text" }],
          };
        }

        if (action === "remove") {
          if (!targetUserId)
            throw new Error("userId is required for remove action.");
          await NotesCollaboratorsService.removeCollaborator(
            userId,
            noteId,
            targetUserId
          );
          return {
            content: [
              { text: `Successfully removed collaborator.`, type: "text" },
            ],
          };
        }

        if (action === "list") {
          const collabs = await NotesCollaboratorsService.listCollaborators(
            userId,
            noteId
          );
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
