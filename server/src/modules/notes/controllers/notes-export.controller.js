const NotesBaseController = require("./base.controller");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const PlansRepository = require("@/modules/plans/plans.repository");
const { PDFService } = require("@/services/note_export/pdf");

/**
 * Exportação de nota em PDF.
 */
class NotesExportController extends NotesBaseController {
  async exportNoteAsPDF(req, res, next) {
    try {
      const { noteId } = req.params; // Nas rotas você definiu como /:id/export/pdf

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // Validar limite de exportações mensais
      const canExport = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "monthly_cycle.exports.notes_count",
        "limits.exports.notes_monthly"
      );

      if (!canExport) {
        return res.status(403).json({
          error: "Limite de exportações atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${planDetails.details.limits.exports.notes_monthly} exportações de notas por mês.`,
        });
      }

      const { note } = await this._validateNoteAccess(noteId, userId);

      if (!note) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      const blocks = await this.blocksRepository.getBlocksByNoteId(noteId);
      const blockTree = this.blocksRepository.buildBlockTree(blocks);

      const dataForPDF = {
        ...note,
        blocks: blockTree,
        collaborators: note.collaborators || [],
        user_name: note.user_name,
        user_email: note.user_email,
      };

      const pdfBuffer = await PDFService.generateNotePDF(dataForPDF);

      // Incrementar contador de exportações
      await PlanUsageManager.consumeExport(usageRecord.id, "notes");

      const filename = `nota-${noteId}-${new Date().getTime()}.pdf`;

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
