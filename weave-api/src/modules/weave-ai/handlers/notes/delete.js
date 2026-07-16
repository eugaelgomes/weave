/**
 * @module weave-ai/handlers/delete-note.handler
 * @description Tool handler to permanently (soft) delete an existing note.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For deleting the note.
 * - `../utils/chat-access.util`: To verify user permissions.
 */
const notesRepository = require("@/modules/notes/notes.repository");
const chatAccessUtil = require("../../utils/chat-access.util");

class DeleteNoteHandler {
  /**
   * Executes the tool logic to delete a note.
   *
   * @param {Object} context - The execution context.
   * @param {string} context.userId - UUID of the user.
   * @param {Record<string, unknown>} context.args - Arguments passed by the LLM.
   * @param {string|null} context.organizationId - UUID of the organization.
   * @param {string} context.lang - Language code for errors.
   * @param {object} context.t - Translation dictionary.
   * @param {string} context.name - Name of the tool.
   * @returns {Promise<{name: string, result: object, success: boolean}>} The execution result.
   */
  async execute({ userId, args, organizationId, lang, name }) {
    const internalNoteId = await chatAccessUtil.assertNoteMutationAccess(
      userId,
      String(args.noteId || ""),
      organizationId,
      lang
    );

    const rowCount = await notesRepository
      .deleteNoteById(internalNoteId)
      .catch(() => 0);

    return {
      name,
      result: {
        deleted: rowCount > 0,
        internalId: internalNoteId,
        noteId: args.noteId,
      },
      success: true,
    };
  }
}

module.exports = new DeleteNoteHandler();
