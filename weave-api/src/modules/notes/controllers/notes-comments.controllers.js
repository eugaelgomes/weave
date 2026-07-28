const NotesBaseController = require("./base.controller");
const { NotesCommentsService } = require("../services/notes-comments.service");

class NotesCommentsController extends NotesBaseController {
  async listComments(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const comments = await NotesCommentsService.listComments(userId, noteId);
      res.status(200).json(comments);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async createComment(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const created = await NotesCommentsService.createComment(
        userId,
        noteId,
        req.body
      );
      res.status(201).json(created);
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }

  async updateComment(req, res, next) {
    try {
      const { noteId, commentId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const updated = await NotesCommentsService.updateComment(
        userId,
        noteId,
        commentId,
        req.body
      );
      res.status(200).json(updated);
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }

  async uploadCommentFiles(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const files = await NotesCommentsService.uploadCommentFiles(
        userId,
        noteId,
        req.files
      );
      res.status(201).json({ files });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }

  async deleteComment(req, res, next) {
    try {
      const { noteId, commentId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await NotesCommentsService.deleteComment(userId, noteId, commentId);
      res.status(200).json({ message: "Comment removed successfully" });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesCommentsController();
