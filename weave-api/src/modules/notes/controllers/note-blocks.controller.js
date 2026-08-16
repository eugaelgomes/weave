const NotesBaseController = require("./base.controller");
const { NoteBlocksService, BlockConflictError } = require("../services/note-blocks.service");

class NoteBlocksController extends NotesBaseController {
  async list(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const blocks = await NoteBlocksService.listBlocks(userId, noteId);
      return res.status(200).json({ blocks });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async create(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const block = await NoteBlocksService.createBlock(userId, noteId, req.body);
      return res.status(201).json(block);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async update(req, res, next) {
    const startedAt = Date.now();
    try {
      const { noteId, blockId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const updated = await NoteBlocksService.updateBlock(userId, noteId, blockId, req.body);

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
      if (error instanceof BlockConflictError) {
        console.info("[notes.blocks.patch.conflict]", {
          blockId: error.blockId,
          currentVersion: error.currentVersion,
          expectedVersion: error.expectedVersion,
          noteId: req.params.noteId,
          userId: req.user?.userId,
        });
        return res.status(409).json({
          blockId: error.blockId,
          code: "BLOCK_CONFLICT",
          currentVersion: error.currentVersion,
          error: error.message,
          expectedVersion: error.expectedVersion,
          serverBlock: error.serverBlock,
        });
      }
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      console.error("[notes.blocks.patch.error]", {
        blockId: req.params?.blockId,
        latency_ms: Date.now() - startedAt,
        noteId: req.params?.noteId,
        userId: req.user?.userId,
      });
      this._handleError(error, res, next);
    }
  }

  async softDelete(req, res, next) {
    try {
      const { noteId, blockId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await NoteBlocksService.deleteBlock(userId, noteId, blockId);
      return res.status(200).json({ success: true });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }

  async reorder(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const updated = await NoteBlocksService.reorderBlocks(userId, noteId, req.body);
      return res.status(200).json({ updated });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }

  async putSync(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { blocks, revision } = await NoteBlocksService.syncBlocks(userId, noteId, req.body);
      return res.status(200).json({ blocks, revision });
    } catch (error) {
      if (error.name === "NoteConflictError") {
        return res.status(409).json({
          code: "NOTE_CONFLICT",
          conflictFields: error.conflictFields,
          currentRevision: error.currentRevision,
          error: error.message,
          noteId: error.noteId,
        });
      }
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NoteBlocksController();
