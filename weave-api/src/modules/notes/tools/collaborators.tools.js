const { z } = require("zod");
const noteCollaboratorsRepository = require("@/modules/notes/repositories/note-collaborators.repository");
const readNotesRepository = require("@/modules/notes/repositories/read-notes.repository");

const addCollaboratorSchema = z.object({
  noteId: z.string().describe("ID of the note"),
  userId: z.string().describe("ID of the user to add as collaborator"),
});

const removeCollaboratorSchema = z.object({
  noteId: z.string().describe("ID of the note"),
  userId: z.string().describe("ID of the user to remove from the note"),
});

const listCollaboratorsSchema = z.object({
  noteId: z.string().describe("ID of the note"),
});

/**
 * Creates the Note Collaborators tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The collaborators tools definition map.
 */
const createNoteCollaboratorsTools = (user) => ({
  add_note_collaborator: {
    description: "Adds a user as a collaborator to a note.",
    handler: async (args) => {
      try {
        const { noteId, userId } = args;

        // Security check
        const accessSummary =
          await readNotesRepository.getNoteAccessSummary(noteId);
        if (!accessSummary || accessSummary.user_id !== user.userId) {
          return {
            content: [
              {
                text: `Note ${noteId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }

        const added = await noteCollaboratorsRepository.addCollaborator(
          noteId,
          userId
        );
        return {
          content: [{ text: JSON.stringify(added, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error adding collaborator: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "add_note_collaborator",
    schema: addCollaboratorSchema,
  },
  list_note_collaborators: {
    description: "Lists all collaborators for a note.",
    handler: async (args) => {
      try {
        const { noteId } = args;
        const collabs =
          await noteCollaboratorsRepository.getCollaboratorsByNoteId(noteId);
        return {
          content: [{ text: JSON.stringify(collabs, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing collaborators: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_note_collaborators",
    schema: listCollaboratorsSchema,
  },
  remove_note_collaborator: {
    description: "Removes a user from a note's collaborators.",
    handler: async (args) => {
      try {
        const { noteId, userId } = args;

        // Security check
        const accessSummary =
          await readNotesRepository.getNoteAccessSummary(noteId);
        if (!accessSummary || accessSummary.user_id !== user.userId) {
          return {
            content: [
              {
                text: `Note ${noteId} not found or access denied.`,
                type: "text",
              },
            ],
            isError: true,
          };
        }

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
      } catch (error) {
        return {
          content: [
            {
              text: `Error removing collaborator: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "remove_note_collaborator",
    schema: removeCollaboratorSchema,
  },
});

module.exports = {
  createNoteCollaboratorsTools,
};
