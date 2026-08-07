/**
 * @module agent-house/handlers/update-note-title.handler
 * @description Tool handler to rename an existing note.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For updating the note title.
 * - `../utils/chat-access.util`: To verify user permissions.
 */
const notesRepository = require("@/modules/notes/notes.repository");
const chatAccessUtil = require("../../utils/chat-access.util");

class UpdateNoteTitleHandler {
  /**
   * Executes the tool logic to update a note's title.
   *
   * @param {Object} context - The execution context.
   * @param {string} context.userId - UUID of the user.
   * @param {Record<string, unknown>} context.args - Arguments passed by the LLM.
   * @param {string|null} context.organizationId - UUID of the organization.
   * @param {string} context.lang - Language code for errors.
   * @param {object} context.t - Translation dictionary.
   * @param {string} context.name - Name of the tool.
   * @returns {Promise<{name: string, result: object, success: boolean}>} The execution result.
   * @param { userId: string, args: Record<string, unknown>, organizationId: string|null, lang: string, t: object, name: string } context
   */
  async execute({ userId, args, organizationId, lang, t: _t, name }) {
    const noteId = await chatAccessUtil.assertNoteMutationAccess(
      userId,
      String(args.noteId || ""),
      organizationId,
      lang
    );
    const oldNote = await notesRepository.getNoteById(noteId).catch(() => null);
    const result = await notesRepository.updateNoteById(noteId, {
      title: args.title,
    });
    return {
      name,
      result: {
        noteId,
        snapshot: oldNote ? { title: oldNote.title, type: "title" } : undefined,
        updated: Boolean(result),
      },
      success: true,
    };
  }
}

module.exports = new UpdateNoteTitleHandler();
