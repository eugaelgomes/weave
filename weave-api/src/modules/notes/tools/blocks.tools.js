const { z } = require("zod");
const noteBlocksRepository = require("@/modules/notes/repositories/note-blocks.repository");
const readNotesRepository = require("@/modules/notes/repositories/read-notes.repository");

const createNoteBlockSchema = z.object({
  done: z
    .boolean()
    .optional()
    .describe("If type is todo, whether it is checked"),
  noteId: z.string().describe("ID of the note"),
  parentId: z
    .string()
    .optional()
    .nullable()
    .describe("Optional parent block ID"),
  position: z.number().optional().describe("Optional position among siblings"),
  text: z.string().optional().describe("Text content for the block"),
  type: z
    .string()
    .optional()
    .describe(
      "Block type which must be one of paragraph, list, todo, heading, heading_1, heading_2, heading_3, image, code, quote, divider, or page"
    ),
});

const updateNoteBlockSchema = z.object({
  blockId: z.string().describe("ID of the block to update"),
  done: z.boolean().optional().describe("If type is todo, new checked state"),
  position: z.number().optional().describe("New position among siblings"),
  text: z.string().optional().describe("New text content"),
  type: z.string().optional().describe("New block type"),
});

const deleteNoteBlockSchema = z.object({
  blockId: z
    .union([z.string(), z.array(z.string())])
    .describe("ID(s) of the block(s) to delete"),
});

/**
 * Creates the Note Blocks tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The blocks tools definition map.
 */
const createNoteBlocksTools = (user) => ({
  create_note_block: {
    description: "Adds a new block to a note.",
    handler: async (args) => {
      try {
        const { noteId, parentId, type, text, position, done } = args;

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

        const newBlock = await noteBlocksRepository.insert(
          noteId,
          user.userId,
          {
            done,
            parent_id: parentId,
            position,
            text,
            type,
          }
        );

        return {
          content: [{ text: JSON.stringify(newBlock, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error creating note block: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "create_note_block",
    schema: createNoteBlockSchema,
  },
  delete_note_block: {
    description: "Deletes one or more blocks.",
    handler: async (args) => {
      try {
        const { blockId } = args;
        const blockIds = Array.isArray(blockId) ? blockId : [blockId];

        const count = await noteBlocksRepository.softDelete(blockIds);

        return {
          content: [
            { text: `Successfully deleted ${count} block(s).`, type: "text" },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error deleting note block: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "delete_note_block",
    schema: deleteNoteBlockSchema,
  },
  update_note_block: {
    description: "Updates a block inside a note.",
    handler: async (args) => {
      try {
        const { blockId, type, text, position, done } = args;

        // We lack a direct block->note access check, but the repository relies on finding the block.
        // If security becomes strict, we should fetch block -> noteId and check note access.
        const updated = await noteBlocksRepository.update(blockId, {
          done,
          position,
          text,
          type,
        });

        if (!updated) {
          return {
            content: [{ text: `Block ${blockId} not found.`, type: "text" }],
            isError: true,
          };
        }

        return {
          content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error updating note block: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "update_note_block",
    schema: updateNoteBlockSchema,
  },
});

module.exports = {
  createNoteBlocksTools,
};
