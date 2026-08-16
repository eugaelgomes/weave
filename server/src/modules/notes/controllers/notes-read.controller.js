const NotesBaseController = require("./base.controller");
const { NotesService } = require("../services/notes.service");

class NotesReadController extends NotesBaseController {
  async getAllNotes(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { notes, pagination } = await NotesService.getAllNotes(userId, req.query);

      if (pagination) {
        res.status(200).json({ notes, pagination });
      } else {
        res.status(200).json({ notes });
      }
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getNoteById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const completeNote = await NotesService.getNoteById(id, userId);
      res.status(200).json(completeNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getNotesStats(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const formattedStats = await NotesService.getNotesStats(userId);
      res.status(200).json(formattedStats);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesReadController();
