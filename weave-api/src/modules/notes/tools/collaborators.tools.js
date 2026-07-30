const { manageNoteCollaboratorsSchema } = require("../schemas/tools.schema");
const {
  NotesCollaboratorsService,
} = require("../services/notes-collaborators.service");
const { API_SCOPES } = require("@/config/api-scopes");

const createNoteCollaboratorsTools = (user) => ({
  manage_note_collaborators: {
    description: `Manage Weave Note Collaborators (add, remove, list).

FUNCTIONALITIES (Actions):
1. 'add': Shares a note with another user.
   - How to use: Provide 'action' as "add", the 'note_id', and the 'user_id' of the person to share with.
   - What it does: Grants the target user access to view and collaborate on the note.
2. 'remove': Revokes access from a collaborator.
   - How to use: Provide 'action' as "remove", the 'note_id', and the 'user_id'.
   - What it does: Removes the specified user's access to the note.
3. 'list': Retrieves all collaborators of a note.
   - How to use: Provide 'action' as "list" and the 'note_id'.
   - What it does: Returns a list of users who have access to the note.`,

    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const { action, note_id, userId: targetUserId } = args;
        const target_user_id = args.user_id || targetUserId;

        if (action === "add") {
          if (!target_user_id)
            throw new Error("user_id is required for add action.");
          const added = await NotesCollaboratorsService.addCollaborator(
            userId,
            note_id,
            target_user_id
          );
          return {
            content: [{ text: JSON.stringify(added, null, 2), type: "text" }],
          };
        }

        if (action === "remove") {
          if (!target_user_id)
            throw new Error("user_id is required for remove action.");
          await NotesCollaboratorsService.removeCollaborator(
            userId,
            note_id,
            target_user_id
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
            note_id
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
    scopes: [API_SCOPES.NOTES_READ, API_SCOPES.NOTES_WRITE],
  },
});

module.exports = {
  createNoteCollaboratorsTools,
};
