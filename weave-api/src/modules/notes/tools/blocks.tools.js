const { manageNoteBlocksSchema } = require("../schemas/tools.schema");
const { NoteBlocksService } = require("../services/note-blocks.service");
const noteBlocksRepository = require("@/modules/notes/repositories/note-blocks.repository");

const createNoteBlocksTools = (user) => ({
  manage_note_blocks: {
    description:
      "Manage note blocks (create, update, delete, list) all in one tool. Use this to manipulate the content structure of a note.",
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const {
          action,
          noteId,
          blockId,
          parentId,
          type,
          text,
          position,
          properties,
        } = args;

        if (action === "create") {
          if (!noteId) throw new Error("noteId is required for create action.");
          const newBlock = await NoteBlocksService.createBlock(userId, noteId, {
            parentId,
            position,
            properties,
            text,
            type,
          });
          return {
            content: [
              { text: JSON.stringify(newBlock, null, 2), type: "text" },
            ],
          };
        }

        if (action === "update") {
          if (!blockId || Array.isArray(blockId)) {
            throw new Error(
              "A single blockId string is required for update action."
            );
          }
          // Fetch block to get noteId for permission check
          const existingBlock =
            await noteBlocksRepository.findNoteBlockById(blockId);
          if (!existingBlock) throw new Error("Block not found.");
          const targetNoteId = String(existingBlock.note_id);

          const updated = await NoteBlocksService.updateBlock(
            userId,
            targetNoteId,
            blockId,
            {
              position,
              properties,
              text,
              type,
            }
          );
          return {
            content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!blockId)
            throw new Error("blockId is required for delete action.");
          const blockIds = Array.isArray(blockId) ? blockId : [blockId];

          let count = 0;
          for (const bid of blockIds) {
            const existingBlock =
              await noteBlocksRepository.findNoteBlockById(bid);
            if (existingBlock) {
              const targetNoteId = String(existingBlock.note_id);
              await NoteBlocksService.deleteBlock(userId, targetNoteId, bid);
              count++;
            }
          }

          return {
            content: [
              { text: `Successfully deleted ${count} block(s).`, type: "text" },
            ],
          };
        }

        if (action === "list") {
          if (!noteId) throw new Error("noteId is required for list action.");
          const tree = await NoteBlocksService.listBlocks(userId, noteId);
          return {
            content: [{ text: JSON.stringify(tree, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error in manage_note_blocks: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_note_blocks",
    schema: manageNoteBlocksSchema,
  },
});

module.exports = {
  createNoteBlocksTools,
};
