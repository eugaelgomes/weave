const { manageNoteBlocksSchema } = require("../schemas/tools.schema");
const { NoteBlocksService } = require("../services/note-blocks.service");
const noteBlocksRepository = require("@/modules/notes/repositories/note-blocks.repository");
const { API_SCOPES } = require("@/config/api-scopes");

const createNoteBlocksTools = (user) => ({
  manage_note_blocks: {
    description: `Manage Weave Note Blocks (create, update, delete, list).
IMPORTANT: A "Weave Note" is a fully-fledged RICH TEXT DOCUMENT. Blocks are the structural units (headings, paragraphs, lists, todos, code) that make up this document's hierarchical tree.

CRITICAL RULE FOR PARAGRAPHS: Do NOT use newline characters (\\n) in text to break lines! If a text needs a line break, you MUST create separate blocks. One paragraph block = one continuous line of text.

FORMATTING & RICH TEXT (Marks & Attributes):
- Allowed Block Types: 'paragraph', 'heading', 'code', 'list', 'todo', 'image', 'video', 'quote', 'divider'.
- Text Formatting (marks array inside properties): You can apply bold, italic, underline, strike, code (inline), highlight (background color), textStyle (text color), link (href). Use { "type": "...", "start": index, "end": index } and optionally "attrs" for links or colors.
- Block Attributes (attrs inside properties):
  - Heading (h1-h4): { "attrs": { "level": 1 } }
  - Lists: { "attrs": { "ordered": true/false } }
  - Todo (checkbox): { "attrs": { "checked": true/false } }
  - Code Block: { "attrs": { "language": "javascript" } }
  - Images/Videos: { "attrs": { "src": "url", "title": "...", "alt": "..." } }
  - Block Background Color: { "attrs": { "background_color": "#hex" } } (Allowed on heading, paragraph, quote, list, todo).

FUNCTIONALITIES (Actions):
1. 'create': Appends or inserts a new block (or multiple blocks) into a note.
   - How to use (single): Provide 'action' as "create", the 'note_id', the block 'type', and 'text'. Optionally provide 'properties' or 'parent_id'.
   - How to use (multiple): Provide 'action' as "create", the 'note_id', and a 'blocks' array containing objects with 'type', 'text', 'properties', etc.
   - What it does: Creates structural blocks inside the note's document tree.
2. 'update': Modifies an existing block.
   - How to use: Provide 'action' as "update", the 'block_id', and the fields to change ('text', 'type', 'properties', 'position').
   - What it does: Updates the content or formatting of the specified block.
3. 'delete': Removes a block from a note.
   - How to use: Provide 'action' as "delete" and the 'block_id' (string or array of strings).
   - What it does: Deletes the specified blocks and any of their nested children.
4. 'list': Retrieves the block structure of a note.
   - How to use: Provide 'action' as "list" and the 'note_id'.
   - What it does: Returns a hierarchical tree of all blocks within the note.
   
EXAMPLES (How to structure data):
- Creating a heading block:
  type = "heading"
  text = "My Title"
  properties = { "attrs": { "level": 2, "background_color": "#f0f0f0" } }

- Creating a paragraph with formatted text (bold & link):
  type = "paragraph"
  text = "Hello world"
  properties = { "marks": [ { "type": "bold", "start": 0, "end": 5 }, { "type": "link", "start": 6, "end": 11, "attrs": { "href": "https://example.com" } } ] }
  
- Creating a todo item:
  type = "todo"
  text = "Buy milk"
  properties = { "attrs": { "checked": false } }`,
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const {
          action,
          note_id,
          block_id,
          parent_id,
          type,
          text,
          position,
          properties,
          blocks,
        } = args;

        if (action === "create") {
          if (!note_id)
            throw new Error("note_id is required for create action.");

          const blocksToCreate =
            blocks && blocks.length > 0
              ? blocks
              : [
                  {
                    parent_id,
                    position,
                    properties,
                    text,
                    type,
                  },
                ];

          if (!blocksToCreate[0].type) {
            throw new Error("block 'type' is required.");
          }

          const newBlocks = [];
          for (const blockData of blocksToCreate) {
            const newBlock = await NoteBlocksService.createBlock(
              userId,
              note_id,
              {
                parentId:
                  blockData.parent_id !== undefined
                    ? blockData.parent_id
                    : parent_id,
                position:
                  blockData.position !== undefined
                    ? blockData.position
                    : position,
                properties: blockData.properties,
                text: blockData.text,
                type: blockData.type,
              }
            );
            newBlocks.push(newBlock);
          }

          return {
            content: [
              {
                text: JSON.stringify(
                  newBlocks.length === 1 ? newBlocks[0] : newBlocks,
                  null,
                  2
                ),
                type: "text",
              },
            ],
          };
        }

        if (action === "update") {
          if (!block_id || Array.isArray(block_id)) {
            throw new Error(
              "A single block_id string is required for update action."
            );
          }
          // Fetch block to get note_id for permission check
          const existingBlock =
            await noteBlocksRepository.findNoteBlockById(block_id);
          if (!existingBlock) throw new Error("Block not found.");
          const targetNoteId = String(existingBlock.note_id);

          const updated = await NoteBlocksService.updateBlock(
            userId,
            targetNoteId,
            block_id,
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
          if (!block_id)
            throw new Error("block_id is required for delete action.");
          const blockIds = Array.isArray(block_id) ? block_id : [block_id];

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
          if (!note_id) throw new Error("note_id is required for list action.");
          const tree = await NoteBlocksService.listBlocks(userId, note_id);
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
    scopes: [API_SCOPES.NOTES_READ, API_SCOPES.NOTES_WRITE],
  },
});

module.exports = {
  createNoteBlocksTools,
};
