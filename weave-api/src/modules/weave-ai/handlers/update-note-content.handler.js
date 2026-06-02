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

class UpdateNoteContentHandler {
  /**
   * @param { userId: string, args: Record<string, unknown>, organizationId: string|null, lang: string, t: object, name: string } context
   */
  async execute({ userId, args, organizationId, lang, t, name }) {

        const rawNoteId = String(args.noteId || "");
        if (!rawNoteId) {
          throw new Error(t.updateNoteContentIdRequired);
        }
        const noteId = await chatAccessUtil.assertNoteMutationAccess(
          userId,
          rawNoteId,
          organizationId,
          lang
        );

        let tree;
        if (Array.isArray(args.blocks) && args.blocks.length > 0) {
          tree = normalizeBlocksTree(args.blocks);
        } else if (
          typeof args.content === "string" &&
          args.content.trim().length > 0
        ) {
          const parsedBlocks = markdownToBlocks(args.content);
          tree =
            parsedBlocks.length > 0
              ? parsedBlocks
              : [
                  {
                    id: newBlockId(),
                    type: "paragraph",
                    properties: { text: args.content },
                  },
                ];
        } else {
          const error = new Error(t.updateNoteContentEmpty);
          error.code = "CHAT_FUNCTION_INVALID_CONTENT";
          error.statusCode = 400;
          throw error;
        }

        if (!chatFormatterUtil.blocksTreeHasMeaningfulText(tree)) {
          const error = new Error(t.updateNoteContentNoText);
          error.code = "CHAT_FUNCTION_INVALID_CONTENT";
          error.statusCode = 400;
          throw error;
        }

        await notesRepository.deleteAllNoteBlocks(noteId);
        await notesRepository.bulkInsertNoteBlocks(noteId, userId, tree);
        await enqueueNoteEmbeddingJob(noteId).catch(() => {});

        return {
          name,
          result: { noteId, updated: true },
          success: true,
        };
      
  }
}

module.exports = new UpdateNoteContentHandler();
