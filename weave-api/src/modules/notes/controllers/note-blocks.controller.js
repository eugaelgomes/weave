const NotesBaseController = require("./base.controller");
const { normalizeBlocksTree } = require("../block-normalizer");

/**
 * CRUD e reordenação de blocos (`note_blocks`).
 */
class NoteBlocksController extends NotesBaseController {
  /**
   * GET /api/notes/:noteId/blocks
   */
  async list(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(noteId, userId);

      const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
        noteId
      );
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

      const block = await this.notesRepository.insertNoteBlock(
        noteId,
        userId,
        {
          type: req.body?.type,
          parent_id: req.body?.parent_id ?? req.body?.parentId,
          position: req.body?.position,
          properties: req.body?.properties,
          text: req.body?.text,
          done: req.body?.done,
        }
      );
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
        return res.status(404).json({ error: "Bloco não encontrado" });
      }

      const updated = await this.notesRepository.updateNoteBlock(blockId, {
        type: req.body?.type,
        position: req.body?.position,
        text: req.body?.text,
        done: req.body?.done,
        properties: req.body?.properties,
      });
      if (!updated) {
        return res.status(404).json({ error: "Bloco não encontrado" });
      }
      if (String(process.env.ENABLE_NOTES_BLOCKS_AUTOSAVE_V2 || "true").toLowerCase() !== "false") {
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
        return res.status(404).json({ error: "Bloco não encontrado" });
      }

      const n = await this.notesRepository.softDeleteNoteBlocks([blockId]);
      if (n === 0) {
        return res.status(400).json({ error: "Não foi possível remover o bloco" });
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
        return res.status(400).json({ error: "ordered_ids inválido" });
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
   * PUT /api/notes/:noteId/blocks — substitui todos os blocos (sync em massa)
   */
  async putSync(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(noteId, userId);

      const tree = req.body?.blocks;
      if (!Array.isArray(tree)) {
        return res.status(400).json({ error: "blocks deve ser array" });
      }
      normalizeBlocksTree(tree);

      await this.notesRepository.deleteAllNoteBlocks(noteId);

      if (tree.length > 0) {
        await this.notesRepository.bulkInsertNoteBlocks(
          noteId,
          userId,
          tree
        );
      } else {
        await this.notesRepository.insertDefaultNoteBlock(noteId, userId);
      }

      const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
        noteId
      );
      return res.status(200).json({ blocks });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NoteBlocksController();
