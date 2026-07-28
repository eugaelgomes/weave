const NotesBaseController = require("./base.controller");
const {
  NotesCollaboratorsService,
} = require("../services/notes-collaborators.service");
const { PlanLimitError } = require("../services/notes.service");
const {
  sendPlanLimitExceeded,
} = require("@/modules/plans/utils/plan-limit-http.util");

class NotesCollaboratorsController extends NotesBaseController {
  async addCollaborator(req, res, next) {
    try {
      const { noteId } = req.params;
      const { userId: collaboratorId } = req.body;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const newCollaborator = await NotesCollaboratorsService.addCollaborator(
        userId,
        noteId,
        collaboratorId
      );

      res.status(201).json({
        collaborator: newCollaborator,
        message: "Collaborator added successfully",
      });
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return sendPlanLimitExceeded(res, {
          error: "Collaborators limit reached",
          limit_key: error.limitKey,
          message: error.message,
          resource: error.resource,
        });
      }
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }

  async removeCollaborator(req, res, next) {
    try {
      const { noteId, collaboratorId } = req.params;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await NotesCollaboratorsService.removeCollaborator(
        userId,
        noteId,
        collaboratorId
      );

      res.status(200).json({
        message: "Collaborator removed successfully",
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      this._handleError(error, res, next);
    }
  }

  async recuseCollaboration(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await NotesCollaboratorsService.recuseCollaboration(userId, noteId);

      res.status(200).json({
        message: "You are no longer a collaborator in this note",
        success: true,
      });
    } catch (error) {
      if (error.statusCode) {
        return res
          .status(error.statusCode)
          .json({ message: error.message, success: false });
      }
      this._handleError(error, res, next);
    }
  }

  async getCollaborators(req, res, next) {
    try {
      const { noteId } = req.params;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const collaborators = await NotesCollaboratorsService.listCollaborators(
        userId,
        noteId
      );

      if (collaborators.length === 0) {
        return res.status(200).json({
          collaborators: [],
          message: "No collaborators found.",
        });
      } else {
        res.status(200).json({
          collaborators,
        });
      }
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesCollaboratorsController();
