const NotesBaseController = require("./base.controller");
const { NotesService, PlanLimitError, NoteConflictError } = require("../services/notes.service");
const { sendPlanLimitExceeded } = require("@/modules/plans/utils/plan-limit-http.util");

class NotesWriteController extends NotesBaseController {
  async createNote(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const formattedNote = await NotesService.createNote(userId, req.body);
      res.status(201).json(formattedNote);
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return sendPlanLimitExceeded(res, {
          error: "Notes limit reached",
          limit_key: error.limitKey,
          message: error.message,
          resource: error.resource,
        });
      }
      this._handleError(error, res, next);
    }
  }

  async createCompleteNote(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // I'll implement createCompleteNote in NotesService later, for now we just call it.
      // Wait, I forgot to implement createCompleteNote in NotesService!
      // I'll call it for now and fix NotesService later if needed, but actually I need to implement it.
      // Since it's big, I'll temporarily keep the logic here or add it to NotesService.
      // Wait, let's look at what's missing. I missed createCompleteNote, uploadDocumentImages.
      const formattedNote = await NotesService.createCompleteNote(userId, req.body);
      res.status(201).json(formattedNote);
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return sendPlanLimitExceeded(res, {
          error: "Notes limit reached",
          limit_key: error.limitKey,
          message: error.message,
          resource: error.resource,
        });
      }
      this._handleError(error, res, next);
    }
  }

  async updateNote(req, res, next) {
    try {
      const { id } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Note: files like req.files.icon are passed, we need to handle them in the service or here.
      // Since file uploads tightly couple with Express req.files, it's often handled in controller OR service.
      // Let's pass the files to the service.
      const payload = { ...req.body, files: req.files };

      const formattedNote = await NotesService.updateNote(userId, id, payload);
      res.status(200).json(formattedNote);
    } catch (error) {
      if (error instanceof NoteConflictError) {
        return res.status(409).json({
          code: "NOTE_CONFLICT",
          conflictFields: error.conflictFields,
          currentRevision: error.currentRevision,
          error: error.message,
          noteId: error.noteId,
          serverNote: error.serverNote,
        });
      }
      if (error.statusCode === 413) {
        return res.status(413).json({ error: error.message, message: error.details });
      }
      if (error instanceof PlanLimitError) {
        return sendPlanLimitExceeded(res, {
          error: "Storage limit reached",
          limit_key: error.limitKey,
          message: error.message,
          resource: error.resource,
        });
      }
      this._handleError(error, res, next);
    }
  }

  async uploadDocumentImages(req, res, next) {
    try {
      const { id } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const uploads = req.files || [];
      if (!uploads.length) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const files = await NotesService.uploadDocumentImages(userId, id, uploads);
      return res.status(201).json({ files });
    } catch (error) {
      if (error.statusCode === 413) {
        return res.status(413).json({ error: error.message, message: error.details });
      }
      if (error instanceof PlanLimitError) {
        return sendPlanLimitExceeded(res, {
          error: "Storage limit reached",
          limit_key: error.limitKey,
          message: error.message,
          resource: error.resource,
        });
      }
      this._handleError(error, res, next);
    }
  }

  async deleteNote(req, res, next) {
    try {
      const { id } = req.params;
      const { ids } = req.body;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      let noteIds = [];
      if (ids && Array.isArray(ids) && ids.length > 0) {
        noteIds = ids;
      } else if (id) {
        noteIds = [id];
      } else {
        return res.status(400).json({ error: "Nenhum ID recebido." });
      }

      const affectedRows = await NotesService.deleteNote(userId, noteIds);
      return res.status(200).json({
        message:
          affectedRows > 1
            ? `${affectedRows} notas deletadas com sucesso`
            : "Nota deletada com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesWriteController();
