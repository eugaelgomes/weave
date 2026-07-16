const NotesBaseController = require("./base.controller");
const PlanUsageManager = require("@/modules/plans/controllers/plans.controller");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { sendPlanLimitExceeded } = require("@/utils/plan-limit-http");
const { PLAN_PATHS } = require("@/services/plans/plan-paths");
const { PDFService } = require("@/modules/notes/services/pdf.service");

/**
 * Export note to PDF.
 */
class NotesExportController extends NotesBaseController {
  async exportNoteAsPDF(req, res, next) {
    try {
      const { noteId } = req.params; // In routes, defined as /:id/export/pdf

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Fetch/Create usage record
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Fetch plan details
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Plan configuration not found for this user.",
        });
      }

      // Validate monthly exports limit
      const canExport = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "monthly_cycle.exports.notes_count",
        "limits.exports.notes_monthly"
      );

      if (!canExport) {
        return sendPlanLimitExceeded(res, {
          error: "Exports limit reached",
          limit_key: PLAN_PATHS.LIMITS.EXPORTS.NOTES_MONTHLY,
          message: `Your plan (${planDetails.name}) allows only ${planDetails.details.limits.exports.notes_monthly} note exports per month.`,
          resource: "exports",
        });
      }

      const { note } = await this._validateNoteAccess(noteId, userId);

      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }

      const blocks =
        await this.notesRepository.findNoteBlocksTreeByNoteId(noteId);

      const dataForPDF = {
        ...note,
        blocks,
        collaborators: note.collaborators || [],
        user_email: note.user_email,
        user_name: note.user_name,
      };

      const pdfBuffer = await PDFService.generateNotePDF(dataForPDF);

      // Increment exports counter
      await PlanUsageManager.consumeExport(usageRecord.id, "notes");

      const filename = `note-${noteId}-${new Date().getTime()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.status(200).send(pdfBuffer);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesExportController();
