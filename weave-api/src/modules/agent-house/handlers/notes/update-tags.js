/**
 * @module agent-house/handlers/update-note-tags.handler
 * @description Tool handler to replace the tags of a note.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For managing note tags.
 * - `../utils/chat-access.util`: To verify user permissions.
 */
const notesRepository = require("@/modules/notes/notes.repository");
const chatAccessUtil = require("../../utils/chat-access.util");

class UpdateNoteTagsHandler {
  /**
   * Executes the tool logic to update a note's tags.
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
    const tags = Array.isArray(args.tags)
      ? args.tags.filter((t) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            t
          )
        )
      : [];
    const result = await notesRepository.updateNoteById(noteId, {
      tags,
    });
    return {
      name,
      result: { noteId, updated: Boolean(result) },
      success: true,
    };
  }
}

module.exports = new UpdateNoteTagsHandler();
