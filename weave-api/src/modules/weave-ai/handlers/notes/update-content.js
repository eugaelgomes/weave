/**
 * @module weave-ai/handlers/update-note-content.handler
 * @description Tool handler to update the rich text content (blocks) of a note.
 *
 * Dependencies:
 * - `@/modules/notes/notes.repository`: For replacing note blocks.
 * - `../utils/chat-access.util`: To verify user permissions.
 * - `../utils/markdown-to-blocks.util`: To format content if blocks are not provided.
 * - `@/services/queue/queue-controller`: To enqueue the note for embedding (RAG updates).
 */
const notesRepository = require("@/modules/notes/notes.repository");

const chatAccessUtil = require("../../utils/chat-access.util");
const chatFormatterUtil = require("../../utils/chat-formatter.util");
const { markdownToBlocks } = require("../../utils/markdown-to-blocks.util");

const {
  normalizeBlocksTree,
  newBlockId,
} = require("@/modules/notes/block-normalizer");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");

class UpdateNoteContentHandler {
  /**
   * Executes the tool logic to update note content blocks.
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
                properties: { text: args.content },
                type: "paragraph",
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

    const oldBlocks = await notesRepository
      .findNoteBlocksTreeByNoteId(noteId)
      .catch(() => []);
    await notesRepository.deleteAllNoteBlocks(noteId);
    await notesRepository.bulkInsertNoteBlocks(noteId, userId, tree);
    await enqueueNoteEmbeddingJob(noteId).catch(() => {});

    return {
      name,
      result: {
        noteId,
        snapshot: { blocks: oldBlocks, type: "content" },
        updated: true,
      },
      success: true,
    };
  }
}

module.exports = new UpdateNoteContentHandler();
