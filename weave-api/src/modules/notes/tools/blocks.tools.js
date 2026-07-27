const { z } = require("zod");
const noteBlocksRepository = require("@/modules/notes/repositories/note-blocks.repository");
const readNotesRepository = require("@/modules/notes/repositories/read-notes.repository");

const blockAttrsSchema = z.object({
  alt: z
    .string()
    .optional()
    .describe("Alternative text. Allowed for image blocks."),
  backgroundColor: z
    .string()
    .optional()
    .describe(
      "Background hex color from the palette. Allowed for heading, paragraph, quote, list, todo blocks."
    ),
  checked: z
    .boolean()
    .optional()
    .describe("Whether the todo is checked. Allowed for todo blocks."),
  language: z
    .string()
    .optional()
    .describe("Programming language string. Allowed for code blocks."),
  level: z
    .number()
    .min(1)
    .max(6)
    .optional()
    .describe("Heading level (1-6). Required for heading blocks."),
  ordered: z
    .boolean()
    .optional()
    .describe("Whether the list is ordered. Allowed for list blocks."),
  src: z
    .string()
    .optional()
    .describe(
      "URL of the image or video (http, https, blob, data, upload:// or notes/). Required for image and video blocks."
    ),
  title: z
    .string()
    .optional()
    .describe("Title text. Allowed for image and video blocks."),
});

const markAttrsSchema = z.object({
  class: z.string().optional().describe("CSS class name for the mark."),
  color: z
    .string()
    .optional()
    .describe(
      "Hex color string from the palette. Allowed for textStyle and highlight marks."
    ),
  href: z.string().optional().describe("Target URL. Required for link marks."),
  rel: z
    .string()
    .optional()
    .describe("Link rel attribute. Allowed for link marks."),
  target: z
    .string()
    .optional()
    .describe("Link target. Allowed for link marks."),
  title: z
    .string()
    .nullable()
    .optional()
    .describe("Link title. Allowed for link marks."),
});

const markSchema = z.object({
  attrs: markAttrsSchema
    .optional()
    .describe("Specific attributes for the mark."),
  end: z.number().describe("End index of the mark."),
  start: z.number().describe("Start index of the mark."),
  type: z
    .enum([
      "bold",
      "code",
      "highlight",
      "italic",
      "link",
      "strike",
      "subscript",
      "superscript",
      "textStyle",
      "underline",
    ])
    .describe("Exact type of the formatting mark."),
});

const blockPropertiesSchema = z
  .object({
    attrs: blockAttrsSchema
      .optional()
      .describe("Block specific attributes mapped by type."),
    level: z.number().optional().describe("Legacy heading level duplication."),
    marks: z
      .array(markSchema)
      .optional()
      .describe("Text formatting marks definitions."),
    text: z.string().optional().describe("Text content within properties."),
  })
  .catchall(z.unknown())
  .describe("Block properties containing formatting marks and specific attrs");

const manageNoteBlocksSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    noteId: z.string().describe("ID of the note"),
    parentId: z
      .string()
      .optional()
      .nullable()
      .describe("Optional parent block ID"),
    position: z.number().optional().describe("Position among siblings"),
    properties: blockPropertiesSchema.optional(),
    text: z.string().optional().describe("Text content for the block"),
    type: z.string().describe("Block type"),
  }),
  z.object({
    action: z.literal("update"),
    blockId: z
      .union([z.string(), z.array(z.string())])
      .describe("ID(s) of the block(s)"),
    position: z.number().optional().describe("Position among siblings"),
    properties: blockPropertiesSchema.optional(),
    text: z.string().optional().describe("Text content for the block"),
    type: z.string().optional().describe("Block type"),
  }),
  z.object({
    action: z.literal("delete"),
    blockId: z
      .union([z.string(), z.array(z.string())])
      .describe("ID(s) of the block(s)"),
  }),
  z.object({
    action: z.literal("list"),
    noteId: z.string().describe("ID of the note"),
  }),
]);

/**
 * Creates the Note Blocks tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The blocks tools definition map.
 */
const createNoteBlocksTools = (user) => ({
  manage_note_blocks: {
    description:
      "Manage note blocks (create, update, delete, list) all in one tool. Use this to manipulate the content structure of a note.",
    handler: async (args) => {
      try {
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
          const accessSummary =
            await readNotesRepository.getNoteAccessSummary(noteId);
          if (!accessSummary || accessSummary.user_id !== user.userId) {
            throw new Error(`Note ${noteId} not found or access denied.`);
          }
          const newBlock = await noteBlocksRepository.insert(
            noteId,
            user.userId,
            {
              parent_id: parentId,
              position,
              properties,
              text,
              type,
            }
          );
          return {
            content: [
              { text: JSON.stringify(newBlock, null, 2), type: "text" },
            ],
          };
        }

        if (action === "update") {
          if (!blockId || Array.isArray(blockId))
            throw new Error(
              "A single blockId string is required for update action."
            );
          const updated = await noteBlocksRepository.update(blockId, {
            position,
            properties,
            text,
            type,
          });
          return {
            content: [{ text: JSON.stringify(updated, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!blockId)
            throw new Error("blockId is required for delete action.");
          const blockIds = Array.isArray(blockId) ? blockId : [blockId];
          const count = await noteBlocksRepository.softDelete(blockIds);
          return {
            content: [
              { text: `Successfully deleted ${count} block(s).`, type: "text" },
            ],
          };
        }

        if (action === "list") {
          if (!noteId) throw new Error("noteId is required for list action.");
          const accessSummary =
            await readNotesRepository.getNoteAccessSummary(noteId);
          if (!accessSummary || accessSummary.user_id !== user.userId) {
            throw new Error(`Note ${noteId} not found or access denied.`);
          }
          const tree = await noteBlocksRepository.findTreeByNoteId(noteId);
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
