const { manageNoteBlocksSchema } = require("../schemas/tools.schema");
const { NoteBlocksService } = require("../services/note-blocks.service");
const { API_SCOPES } = require("@/config/api-scopes");
const { markdownToBlocks } = require("@/modules/agent-house/utils/markdown-to-blocks.util");
const { blocksToMarkdown } = require("@/modules/notes/utils/blocks-to-markdown.util");
const notesRepository = require("@/modules/notes/notes.repository");
const { resolveNoteIdToUuid } = require("@/modules/notes/utils/note-id-lookup.util");

const createNoteBlocksTools = (user) => ({
  manage_note_blocks: {
    description: `Manage Weave Note Blocks using Markdown (create, update, read).
IMPORTANT: A "Weave Note" is a fully-fledged RICH TEXT DOCUMENT. 

FUNCTIONALITIES (Actions):
1. 'read': Retrieves the note content as Markdown.
2. 'create': Appends Markdown content to the end of the note.
3. 'update': Replaces the entire note content with the provided Markdown.`,
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const { action, note_id, markdown } = args;
        if (!note_id) throw new Error("note_id is required.");

        const resolvedNoteId = await resolveNoteIdToUuid(note_id);
        if (!resolvedNoteId) throw new Error("Note not found.");

        if (action === "read") {
          const tree = await NoteBlocksService.listBlocks(userId, resolvedNoteId);
          const md = blocksToMarkdown(tree);
          return { content: [{ text: md, type: "text" }] };
        }

        if (action === "update") {
          if (markdown === undefined) throw new Error("markdown is required for update.");
          const blocks = markdownToBlocks(markdown);
          const note = await notesRepository.getNoteById(resolvedNoteId);
          if (!note) throw new Error("Note not found.");

          await NoteBlocksService.syncBlocks(userId, resolvedNoteId, {
            base_revision: note.revision || 1,
            blocks,
          });
          return { content: [{ text: "Note successfully updated.", type: "text" }] };
        }

        if (action === "create") {
          if (markdown === undefined) throw new Error("markdown is required for create.");
          const tree = await NoteBlocksService.listBlocks(userId, resolvedNoteId);
          const currentMd = blocksToMarkdown(tree);
          const newMd = currentMd ? currentMd + "\\n\\n" + markdown : markdown;
          const blocks = markdownToBlocks(newMd);

          const note = await notesRepository.getNoteById(resolvedNoteId);
          if (!note) throw new Error("Note not found.");

          await NoteBlocksService.syncBlocks(userId, resolvedNoteId, {
            base_revision: note.revision || 1,
            blocks,
          });
          return { content: [{ text: "Content successfully appended.", type: "text" }] };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [{ text: `Error in manage_note_blocks: ${error.message}`, type: "text" }],
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
