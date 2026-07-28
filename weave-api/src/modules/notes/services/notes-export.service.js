const PlansService = require("@/modules/plans/services/plans.service");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { PLAN_PATHS } = require("@/modules/plans/utils/plan-paths.util");
const { PDFService } = require("../utils/pdf-export.util");
const { NotesService, PlanLimitError } = require("./notes.service");

class NotesExportService {
  async exportNoteAsPDF(userId, noteId) {
    const usageRecord = await PlansService.managePlanUsage(userId);
    const getUserPlan = await PlansRepository.getUserAndPlan(userId);
    const planDetails = await PlansRepository.getPlanById(getUserPlan.plan_id);

    if (!usageRecord || !planDetails) {
      const err = new Error("Plan configuration not found for this user.");
      err.statusCode = 404;
      throw err;
    }

    const canExport = PlansService.checkLimit(
      planDetails.details,
      usageRecord.usage_details,
      "monthly_cycle.exports.notes_count",
      "limits.exports.notes_monthly"
    );

    if (!canExport) {
      throw new PlanLimitError(
        `Your plan (${planDetails.name}) allows only ${planDetails.details.limits.exports.notes_monthly} note exports per month.`,
        PLAN_PATHS.LIMITS.EXPORTS.NOTES_MONTHLY,
        "exports"
      );
    }

    const { note } = await NotesService._validateNoteAccess(noteId, userId);

    if (!note) {
      const err = new Error("Note not found");
      err.statusCode = 404;
      throw err;
    }

    // _validateNoteAccess does not populate blocks, so we get them manually
    const blocks =
      await NotesService.notesRepository.findNoteBlocksTreeByNoteId(noteId);

    const dataForPDF = {
      ...note,
      blocks,
      collaborators: note.collaborators || [],
      user_email: note.user_email,
      user_name: note.user_name,
    };

    const pdfBuffer = await PDFService.generateNotePDF(dataForPDF);

    await PlansService.consumeExport(usageRecord.id, "notes");

    return pdfBuffer;
  }
}

module.exports = {
  NotesExportService: new NotesExportService(),
};
