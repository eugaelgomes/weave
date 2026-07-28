const notesRepository = require("@/modules/notes/notes.repository");
const {
  normalizeBlocksTree,
  flattenBlocksForInsert,
} = require("../block-normalizer");
const { getConnection } = require("@/database/connection");
const spacesService = require("@/services/storage");
const {
  enqueueNoteEmbeddingJob,
} = require("@/services/queue/queue-controller");
const {
  resolveNoteIdToUuid,
  buildNoteIdWhereClause,
} = require("@/modules/notes/utils/note-id-lookup.util");
const { NotesService } = require("./notes.service");

class BlockConflictError extends Error {
  constructor(message, currentVersion, expectedVersion, serverBlock, blockId) {
    super(message);
    this.name = "BlockConflictError";
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
    this.serverBlock = serverBlock;
    this.blockId = blockId;
  }
}

class NoteBlocksService {
  constructor() {
    this.notesRepository = notesRepository;
  }

  _parsePositiveInt(rawValue) {
    if (rawValue === undefined || rawValue === null || rawValue === "")
      return null;
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed < 1)
      throw new Error("Invalid integer");
    return parsed;
  }

  async _processExternalMedia(tree, noteId, userId) {
    for (const block of tree) {
      if (
        (block.type === "image" || block.type === "video") &&
        block.properties?.attrs?.src
      ) {
        const src = block.properties.attrs.src;
        const isExternalHttp =
          /^https?:\/\//i.test(src) &&
          !src.includes("/notes/") &&
          !src.includes("upload://");
        const isDataUri = /^data:(image|video)\/[a-zA-Z0-9+.-]+;base64,/i.test(
          src
        );

        if (isExternalHttp || isDataUri) {
          try {
            const resp = await fetch(src);
            if (resp.ok) {
              const contentType = resp.headers.get("content-type");
              if (
                contentType &&
                (contentType.startsWith("image/") ||
                  contentType.startsWith("video/"))
              ) {
                const buffer = Buffer.from(await resp.arrayBuffer());
                const newUrl = await spacesService.uploadNoteDocumentImage(
                  buffer,
                  contentType,
                  noteId,
                  userId,
                  isDataUri ? "pasted-media" : "external-media"
                );
                block.properties.attrs.src = newUrl;
              }
            }
          } catch (e) {
            console.error(
              `Failed to process media (${isDataUri ? "data-uri" : src}):`,
              e.message
            );
          }
        }
      }
      if (Array.isArray(block.children) && block.children.length > 0) {
        await this._processExternalMedia(block.children, noteId, userId);
      }
    }
  }

  async listBlocks(userId, noteId) {
    await NotesService._validateNoteAccess(noteId, userId);
    const blocks =
      await this.notesRepository.findNoteBlocksTreeByNoteId(noteId);
    return blocks;
  }

  async createBlock(userId, noteId, payload) {
    // We can use the lightweight version directly from repo or just standard access validation
    await NotesService._validateNoteAccess(noteId, userId);

    const block = await this.notesRepository.insertNoteBlock(noteId, userId, {
      parent_id: payload.parent_id ?? payload.parentId,
      position: payload.position,
      properties: payload.properties,
      text: payload.text,
      type: payload.type,
    });
    return block;
  }

  async updateBlock(userId, noteId, blockId, payload) {
    await NotesService._validateNoteAccess(noteId, userId);

    const existing = await this.notesRepository.findNoteBlockById(blockId);
    if (!existing || String(existing.note_id) !== String(noteId)) {
      const err = new Error("Block not found");
      err.statusCode = 404;
      throw err;
    }

    const expectedVersion = this._parsePositiveInt(
      payload.expectedVersion ?? payload.expected_version
    );

    if (
      expectedVersion !== null &&
      Number(existing.version) !== expectedVersion
    ) {
      throw new BlockConflictError(
        "Edit conflict on block",
        Number(existing.version),
        expectedVersion,
        existing,
        blockId
      );
    }

    const updated = await this.notesRepository.updateNoteBlock(
      blockId,
      {
        position: payload.position,
        properties: payload.properties,
        text: payload.text,
        type: payload.type,
      },
      expectedVersion
    );

    if (!updated) {
      const latest = await this.notesRepository.findNoteBlockById(blockId);
      if (latest && String(latest.note_id) === String(noteId)) {
        throw new BlockConflictError(
          "Edit conflict on block",
          Number(latest.version),
          expectedVersion,
          latest,
          blockId
        );
      }
      const err = new Error("Block not found");
      err.statusCode = 404;
      throw err;
    }

    return updated;
  }

  async deleteBlock(userId, noteId, blockId) {
    await NotesService._validateNoteAccess(noteId, userId);

    const existing = await this.notesRepository.findNoteBlockById(blockId);
    if (!existing || String(existing.note_id) !== String(noteId)) {
      const err = new Error("Block not found");
      err.statusCode = 404;
      throw err;
    }

    const n = await this.notesRepository.softDeleteNoteBlocks([blockId]);
    if (n === 0) {
      const err = new Error("Could not remove the block");
      err.statusCode = 400;
      throw err;
    }
    return true;
  }

  async reorderBlocks(userId, noteId, payload) {
    await NotesService._validateNoteAccess(noteId, userId);

    const parentRaw = payload.parent_id ?? payload.parentId;
    const parentId =
      parentRaw === null || parentRaw === undefined || parentRaw === ""
        ? null
        : String(parentRaw);
    const orderedIds = payload.ordered_ids ?? payload.orderedIds;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      const err = new Error("Invalid ordered_ids");
      err.statusCode = 400;
      throw err;
    }

    const updated = await this.notesRepository.reorderNoteBlocks(
      noteId,
      parentId,
      orderedIds.map(String)
    );
    return updated;
  }

  async syncBlocks(userId, noteIdParam, payload) {
    const noteId = (await resolveNoteIdToUuid(noteIdParam)) || noteIdParam;
    await NotesService._validateNoteAccess(noteId, userId);

    const baseRevision = this._parsePositiveInt(
      payload.baseRevision ?? payload.base_revision
    );
    if (baseRevision === null) {
      const err = new Error("baseRevision is required");
      err.statusCode = 400;
      throw err;
    }

    const tree = payload.blocks;
    if (!Array.isArray(tree)) {
      const err = new Error("blocks must be an array");
      err.statusCode = 400;
      throw err;
    }

    await this._processExternalMedia(tree, noteId, userId);
    normalizeBlocksTree(tree);

    let nextRevision = null;
    const client = await getConnection();
    try {
      await client.query("BEGIN");
      const noteIdWhere = buildNoteIdWhereClause("notes", 1, noteId);
      const noteResult = await client.query(
        `
          UPDATE notes
          SET revision = revision + 1, updated_at = NOW()
          WHERE ${noteIdWhere} AND revision = $2
          RETURNING revision
        `,
        [noteId, baseRevision]
      );
      if ((noteResult.rowCount || 0) === 0) {
        await client.query("ROLLBACK");
        const latestNote = await this.notesRepository.getNoteById(noteId);
        const err = new Error("Edit conflict detected");
        err.name = "NoteConflictError";
        err.conflictFields = ["blocks"];
        err.currentRevision =
          latestNote?.revision === undefined || latestNote?.revision === null
            ? null
            : Number(latestNote.revision);
        err.noteId = noteId;
        throw err;
      }
      nextRevision = Number(noteResult.rows[0]?.revision || baseRevision);

      await client.query(`DELETE FROM note_blocks WHERE note_id = $1::uuid`, [
        noteId,
      ]);
      if (tree.length > 0) {
        const flat = flattenBlocksForInsert(tree, noteId, userId, null, 0);
        for (const row of flat) {
          await client.query(
            `
              INSERT INTO note_blocks (
                id, note_id, parent_id, type, properties, position, version, created_by
              )
              VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb, $6, 1, $7::uuid)
            `,
            [
              row.id,
              row.note_id,
              row.parent_id,
              row.type,
              JSON.stringify(row.properties || {}),
              row.position,
              row.created_by,
            ]
          );
        }
      } else {
        await client.query(
          `
            INSERT INTO note_blocks (
              note_id, parent_id, type, properties, position, version, created_by
            )
            VALUES ($1, NULL, 'paragraph', '{}'::jsonb, 0, 1, $2)
          `,
          [noteId, userId]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    const blocks =
      await this.notesRepository.findNoteBlocksTreeByNoteId(noteId);
    await enqueueNoteEmbeddingJob(noteId).catch(() => {});

    return { blocks, revision: nextRevision };
  }
}

module.exports = {
  BlockConflictError,
  NoteBlocksService: new NoteBlocksService(),
};
