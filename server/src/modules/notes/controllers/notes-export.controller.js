const NotesBaseController = require("./base.controller");
const { NotesExportService } = require("../services/notes-export.service");
const { PlanLimitError } = require("../services/notes.service");
const { sendPlanLimitExceeded } = require("@/modules/plans/utils/plan-limit-http.util");

class NotesExportController extends NotesBaseController {
  async exportNoteAsPDF(req, res, next) {
    try {
      const { noteId } = req.params;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const pdfBuffer = await NotesExportService.exportNoteAsPDF(userId, noteId);
      const filename = `note-${noteId}-${new Date().getTime()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.status(200).send(pdfBuffer);
    } catch (error) {
      if (error instanceof PlanLimitError) {
        return sendPlanLimitExceeded(res, {
          error: "Exports limit reached",
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
}

module.exports = new NotesExportController();
