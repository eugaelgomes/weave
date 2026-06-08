const notesRepository = require("@/modules/notes/notes.repository");
const projectsReadRepository = require("@/modules/projects/repositories/projects-read.repository");
const projectsUpdateRepository = require("@/modules/projects/repositories/projects-update.repository");
const workspaceUserScopeRepository = require("@/modules/users/repositories/workspace-user-scope.repository");
const chatAccessUtil = require("../utils/chat-access.util");
const chatFormatterUtil = require("../utils/chat-formatter.util");
const { markdownToBlocks } = require("../utils/markdown-to-blocks.util");
const { NOTE_STATUS } = require("@/utils/patterns/product-patterns");
const { WORKSPACE_SHARE_DENIED } = require("@/utils/workspace-share-guard");
const {
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");

class UpdateNoteCollaboratorAddHandler {
  /**
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
