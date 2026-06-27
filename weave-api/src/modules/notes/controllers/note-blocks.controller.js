const NotesBaseController = require("./base.controller");
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
} = require("@/utils/note-id-lookup");

/**
 * CRUD and reordering of blocks (`note_blocks`).
 */
class NoteBlocksController extends NotesBaseController {
  _parsePositiveInt(rawValue, fieldName) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return null;
    }
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error(`Invalid ${fieldName}`);
    }
    return parsed;
  }

  async _processExternalMedia(tree, noteId, userId) {
    for (const block of tree) {
      if (
        (block.type === "image" || block.type === "video") &&
        block.properties?.attrs?.src
      ) {
        const src = block.properties.attrs.src;
        // Detects if it's an external link (http/https) not from our storage or a base64/data URI
        const isExternalHttp =
          /^https?:\/\//i.test(src) &&
          !src.includes("/notes/") &&
          !src.includes("upload://");
        const isDataUri = /^data:(image|video)\/[a-zA-Z0-9+.-]+;base64,/i.test(
          src
        );

        if (isExternalHttp || isDataUri) {
          try {
            console.info(`[notes.blocks.sync] Processing media for upload...`);
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
                console.info(
                  `[notes.blocks.sync] Media saved in storage: ${newUrl}`
                );
              }
            }
          } catch (e) {
            console.error(
              `[notes.blocks.sync] Failed to process media (${isDataUri ? "data-uri" : src}):`,
              e.message
            );
            // Continue with the original URL, the validator will decide if it passes
          }
        }
      }
      if (Array.isArray(block.children) && block.children.length > 0) {
        await this._processExternalMedia(block.children, noteId, userId);
      }
    }
  }

  /**
   * GET /api/notes/:noteId/blocks
   */
  async list(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(noteId, userId);

      const blocks =
        await this.notesRepository.findNoteBlocksTreeByNoteId(noteId);
      return res.status(200).json({ blocks });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/notes/:noteId/blocks
   */
  async create(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccessLightweight(noteId, userId);

      const block = await this.notesRepository.insertNoteBlock(noteId, userId, {
        type: req.body?.type,
        parent_id: req.body?.parent_id ?? req.body?.parentId,
        position: req.body?.position,
        properties: req.body?.properties,
        text: req.body?.text,
        done: req.body?.done,
      });
      return res.status(201).json(block);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PATCH /api/notes/:noteId/blocks/:blockId
   */
  async update(req, res, next) {
    const startedAt = Date.now();
    try {
      const { noteId, blockId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccessLightweight(noteId, userId);

      const existing = await this.notesRepository.findNoteBlockById(blockId);
      if (!existing || String(existing.note_id) !== String(noteId)) {
        return res.status(404).json({ error: "Block not found" });
      }
      const expectedVersion = this._parsePositiveInt(
        req.body?.expectedVersion ?? req.body?.expected_version,
        "expectedVersion"
      );
      if (
        expectedVersion !== null &&
        Number(existing.version) !== expectedVersion
      ) {
        console.info("[notes.blocks.patch.conflict]", {
          blockId,
          currentVersion: Number(existing.version),
          expectedVersion,
          noteId,
          userId,
        });
        return res.status(409).json({
          code: "BLOCK_CONFLICT",
          error: "Edit conflict on block",
          blockId,
          expectedVersion,
          currentVersion: Number(existing.version),
          serverBlock: existing,
        });
      }

      const updated = await this.notesRepository.updateNoteBlock(
        blockId,
        {
          type: req.body?.type,
          position: req.body?.position,
          text: req.body?.text,
          done: req.body?.done,
          properties: req.body?.properties,
        },
        expectedVersion
      );
      if (!updated) {
        const latest = await this.notesRepository.findNoteBlockById(blockId);
        if (latest && String(latest.note_id) === String(noteId)) {
          console.info("[notes.blocks.patch.conflict]", {
            blockId,
            currentVersion: Number(latest.version),
            expectedVersion,
            noteId,
            userId,
          });
          return res.status(409).json({
            code: "BLOCK_CONFLICT",
            error: "Edit conflict on block",
            blockId,
            expectedVersion,
            currentVersion: Number(latest.version),
            serverBlock: latest,
          });
        }
        return res.status(404).json({ error: "Block not found" });
      }
      if (
        String(
          process.env.ENABLE_NOTES_BLOCKS_AUTOSAVE_V2 || "true"
        ).toLowerCase() !== "false"
      ) {
        console.info("[notes.blocks.patch]", {
          blockId,
          latency_ms: Date.now() - startedAt,
          noteId,
          rateLimitRemaining: req.rateLimit?.remaining ?? null,
          userId,
        });
      }
      return res.status(200).json(updated);
    } catch (error) {
      console.error("[notes.blocks.patch.error]", {
        blockId: req.params?.blockId,
        latency_ms: Date.now() - startedAt,
        noteId: req.params?.noteId,
        userId: req.user?.userId,
      });
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/notes/:noteId/blocks/:blockId
   */
  async softDelete(req, res, next) {
    try {
      const { noteId, blockId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccessLightweight(noteId, userId);

      const existing = await this.notesRepository.findNoteBlockById(blockId);
      if (!existing || String(existing.note_id) !== String(noteId)) {
        return res.status(404).json({ error: "Block not found" });
      }

      const n = await this.notesRepository.softDeleteNoteBlocks([blockId]);
      if (n === 0) {
        return res.status(400).json({ error: "Could not remove the block" });
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/notes/:noteId/blocks/reorder
   * body: { parent_id?: string | null, ordered_ids: string[] }
   */
  async reorder(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccessLightweight(noteId, userId);

      const parentRaw = req.body?.parent_id ?? req.body?.parentId;
      const parentId =
        parentRaw === null || parentRaw === undefined || parentRaw === ""
          ? null
          : String(parentRaw);
      const orderedIds = req.body?.ordered_ids ?? req.body?.orderedIds;
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return res.status(400).json({ error: "Invalid ordered_ids" });
      }

      const updated = await this.notesRepository.reorderNoteBlocks(
        noteId,
        parentId,
        orderedIds.map(String)
      );
      return res.status(200).json({ updated });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:noteId/blocks — replace all blocks (bulk sync)
   */
  async putSync(req, res, next) {
    try {
      const { noteId: noteIdParam } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const noteId = (await resolveNoteIdToUuid(noteIdParam)) || noteIdParam;

      await this._validateNoteAccess(noteId, userId);
      const baseRevision = this._parsePositiveInt(
        req.body?.baseRevision ?? req.body?.base_revision,
        "baseRevision"
      );
      if (baseRevision === null) {
        return res.status(400).json({ error: "baseRevision is required" });
      }

      const tree = req.body?.blocks;
      if (!Array.isArray(tree)) {
        return res.status(400).json({ error: "blocks must be an array" });
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
          console.info("[notes.blocks.sync.conflict]", {
            baseRevision,
            noteId,
            serverRevision: latestNote?.revision ?? null,
            userId,
          });
          return res.status(409).json({
            code: "NOTE_CONFLICT",
            error: "Edit conflict detected",
            noteId,
            currentRevision:
              latestNote?.revision === undefined ||
              latestNote?.revision === null
                ? null
                : Number(latestNote.revision),
            conflictFields: ["blocks"],
          });
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

      return res.status(200).json({ blocks, revision: nextRevision });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NoteBlocksController();
