const { manageNotesSchema } = require("../schemas/tools.schema");
const { NotesService } = require("../services/notes.service");
const McpLinksUtil = require("@/utils/mcp-links.util");
const { API_SCOPES } = require("@/config/api-scopes");
const spacesService = require("@/services/storage/index");
const { resolveNoteIdToUuid } = require("@/modules/notes/utils/note-id-lookup.util");

const createNotesTools = (user) => ({
  manage_notes: {
    description: `Manage Weave Notes (create, update, delete, get, list).
IMPORTANT: A "Weave Note" is a fully-fledged RICH TEXT DOCUMENT composed of a hierarchical tree of structural blocks (headings, paragraphs, lists, todos, code). It is NOT a simple flashcard or sticky note. Use manage_note_blocks to add or modify its rich text content.

FUNCTIONALITIES (Actions):
1. 'create': Creates a new note.
   - How to use: Provide 'action' as "create" and a 'title'. Optionally include 'project_id', 'status', and 'tags'.
   - What it does: Creates a new note document in the user's workspace.
2. 'update': Modifies an existing note.
   - How to use: Provide 'action' as "update", the 'note_id', and only the fields to change.
   - What it does: Updates metadata of the specified note (it does NOT update blocks/content, use manage_note_blocks for that).
3. 'get': Retrieves a note's details.
   - How to use: Provide 'action' as "get" and the 'note_id'.
   - What it does: Returns the note's metadata and settings.
4. 'delete': Deletes a note.
   - How to use: Provide 'action' as "delete" and the 'note_id'.
   - What it does: Soft-deletes the note and cascades deletion to blocks and comments.
5. 'list': Lists notes in the workspace.
   - How to use: Provide 'action' as "list". Optionally include 'search', 'limit', 'page', 'sort_by', and 'sort_order'.
   - What it does: Returns a paginated list of notes accessible to the user.
6. 'upload_file': Uploads a file (or image) attached to a note.
   - How to use: Provide 'action' as "upload_file", 'note_id', 'mime_type', and 'base64_data'. Use 'is_image: true' for document images.
7. 'read_file': Reads a file from its public URL.
   - How to use: Provide 'action' as "read_file" and 'url'. Returns base64 string.
8. 'delete_file': Deletes a file given its public URL.
   - How to use: Provide 'action' as "delete_file" and 'url'.`,
    handler: async (args) => {
      try {
        const userId = user?.userId || user?.id;
        if (!userId) throw new Error("Unauthorized");

        const {
          action,
          note_id,
          title,
          tags,
          status,
          project_id,
          limit,
          page,
          search,
          sort_by,
          sort_order,
          base64_data,
          file_name,
          is_image,
          mime_type,
          url,
        } = args;

        if (action === "create") {
          if (!title) throw new Error("title is required for create action");
          const newNote = await NotesService.createNote(userId, {
            project_id,
            status,
            tags,
            title,
          });
          const enrichedNote = McpLinksUtil.enrichWithAppUrl(newNote, "note", "public_note_id");
          return {
            content: [{ text: JSON.stringify(enrichedNote, null, 2), type: "text" }],
          };
        }

        if (action === "get") {
          if (!note_id) throw new Error("note_id is required for get action");
          const note = await NotesService.getNoteById(note_id, userId);
          const enrichedNote = McpLinksUtil.enrichWithAppUrl(note, "note", "public_note_id");
          return {
            content: [{ text: JSON.stringify(enrichedNote, null, 2), type: "text" }],
          };
        }

        if (action === "update") {
          if (!note_id) throw new Error("note_id is required for update action");
          const currentNote = await NotesService.getNoteById(note_id, userId);
          const updated = await NotesService.updateNote(userId, note_id, {
            baseRevision: currentNote.revision,
            status,
            tags,
            title,
          });
          const enrichedNote = McpLinksUtil.enrichWithAppUrl(updated, "note", "public_note_id");
          return {
            content: [{ text: JSON.stringify(enrichedNote, null, 2), type: "text" }],
          };
        }

        if (action === "delete") {
          if (!note_id) throw new Error("note_id is required for delete action");
          const count = await NotesService.deleteNote(userId, note_id);
          return {
            content: [{ text: `Successfully deleted ${count} note(s).`, type: "text" }],
          };
        }

        if (action === "list") {
          const result = await NotesService.getAllNotes(userId, {
            limit: limit || 10,
            page: page || 1,
            search,
            sortBy: sort_by || "updated_at",
            sortOrder: sort_order || "desc",
            tags: tags || [],
          });

          if (result && result.notes) {
            result.notes = result.notes.map((n) =>
              McpLinksUtil.enrichWithAppUrl(n, "note", "public_note_id")
            );
          } else if (Array.isArray(result)) {
            // Fallback se não for paginado
            for (let i = 0; i < result.length; i++) {
              result[i] = McpLinksUtil.enrichWithAppUrl(result[i], "note", "public_note_id");
            }
          }

          return {
            content: [{ text: JSON.stringify(result, null, 2), type: "text" }],
          };
        }

        if (action === "upload_file") {
          if (!note_id) throw new Error("note_id is required for upload_file action");
          const buffer = Buffer.from(base64_data, "base64");
          const noteUuid = (await resolveNoteIdToUuid(note_id)) || note_id;
          let result;
          if (is_image) {
            result = await spacesService.uploadNoteDocumentImage(
              buffer,
              mime_type,
              noteUuid,
              userId,
              file_name
            );
          } else {
            result = await spacesService.uploadNoteFile(
              buffer,
              mime_type,
              noteUuid,
              userId,
              file_name
            );
          }
          return {
            content: [
              {
                text: "File uploaded successfully!\nURL: " + result.url + "\nKey: " + result.key,
                type: "text",
              },
            ],
          };
        }

        if (action === "read_file") {
          const key = spacesService.extractKeyFromUrl(url);
          if (!key) throw new Error("Invalid URL or could not extract file key");
          const buffer = await spacesService.downloadFile(key);
          const base64Str = buffer.toString("base64");
          return {
            content: [
              { text: `File successfully read. Extracted ${buffer.length} bytes.`, type: "text" },
              { text: "data:application/octet-stream;base64," + base64Str, type: "text" },
            ],
          };
        }

        if (action === "delete_file") {
          const key = spacesService.extractKeyFromUrl(url);
          if (!key) throw new Error("Invalid URL or could not extract file key");
          const success = await spacesService.deleteImage(key);
          if (!success) throw new Error("Failed to delete file from storage.");
          return {
            content: [{ text: "File deleted successfully (Key: " + key + ")", type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [{ text: `Error in manage_notes: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "manage_notes",
    schema: manageNotesSchema,
    scopes: [API_SCOPES.NOTES_READ, API_SCOPES.NOTES_WRITE, API_SCOPES.NOTES_DELETE],
  },
});

module.exports = { createNotesTools };
