/**
 * @module agent-house/handlers/update-note-collaborator-add.handler
 * @description Tool handler to add a collaborator to a note.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For managing note collaboration.
 * - `../utils/chat-access.util`: To verify user permissions.
 */
const notesRepository = require("@/modules/notes/notes.repository");

const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const chatAccessUtil = require("../../utils/chat-access.util");

class UpdateNoteCollaboratorAddHandler {
  /**
   * Executes the tool logic to add a note collaborator.
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
  async execute({ userId, args, organizationId, lang, t, name }) {
    const noteId = await chatAccessUtil.assertNoteMutationAccess(
      userId,
      String(args.noteId || ""),
      organizationId,
      lang
    );
    const collabUid = String(args.collaboratorUserId || "");
    if (!collabUid) {
      const error = new Error(t.collabIdRequired);
      error.statusCode = 400;
      throw error;
    }
    const mayShare = await workspaceUserScopeRepository.usersMayInteract(
      userId,
      collabUid
    );
    if (!mayShare) {
      const err = new Error(WORKSPACE_SHARE_DENIED.message);
      err.statusCode = 403;
      err.code = "WORKSPACE_SHARE_DENIED";
      throw err;
    }
    const result = await notesRepository.addCollaborator(noteId, collabUid);
    return {
      name,
      result: { noteId, updated: Boolean(result) },
      success: true,
    };
  }
}

module.exports = new UpdateNoteCollaboratorAddHandler();
