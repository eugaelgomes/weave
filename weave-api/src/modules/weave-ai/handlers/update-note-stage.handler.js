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

class UpdateNoteStageHandler {
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
        const note = await notesRepository.getNoteById(noteId);
        if (!note?.project_id) {
          throw new Error(t.noteNotAssociatedToProject);
        }
        const projectId = String(note.project_id);
        const parsedStageId =
          args.stageId === undefined ||
          args.stageId === null ||
          args.stageId === ""
            ? null
            : String(args.stageId);
        if (!parsedStageId) {
          throw new Error(t.stageRequired);
        }
        const stages = await projectsReadRepository.getProjectStages(projectId);
        if (!stages.some((s) => String(s.id) === parsedStageId)) {
          throw new Error(t.stageNotFound);
        }
        const result = await notesRepository.updateNoteById(noteId, {
          project_stage_id: parsedStageId,
        });
        return {
          name,
          result: { noteId, updated: Boolean(result) },
          success: true,
        };
      
  }
}

module.exports = new UpdateNoteStageHandler();
