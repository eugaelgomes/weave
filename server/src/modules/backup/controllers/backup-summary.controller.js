const BackupBaseController = require("./base.controller");
const FetchBackupDataRepository = require("@/modules/backup/repositories/fetch-backup-data.repository");

/**
 * Resumo agregado dos dados elegíveis para backup.
 */
class BackupSummaryController extends BackupBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async getBackupSummary(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const rawData = await FetchBackupDataRepository.getAllData(userId);

      const summary = {
        total_notes: rawData.length,
        owned_notes: rawData.filter((n) => n.owner_id === userId).length,
        collaborated_notes: rawData.filter((n) => n.owner_id !== userId).length,
        total_blocks: rawData.reduce(
          (sum, n) => sum + (n.blocks?.filter((b) => !b.deleted).length || 0),
          0
        ),
        total_collaborators: new Set(
          rawData.flatMap(
            (n) =>
              n.collaborators
                ?.filter((c) => !c.removed)
                .map((c) => c.collaborator_id) || []
          )
        ).size,
        oldest_note:
          rawData.length > 0
            ? Math.min(...rawData.map((n) => new Date(n.created_at)))
            : null,
        newest_note:
          rawData.length > 0
            ? Math.max(...rawData.map((n) => new Date(n.created_at)))
            : null,
        last_updated:
          rawData.length > 0
            ? Math.max(...rawData.map((n) => new Date(n.updated_at)))
            : null,
      };

      const notesByMonth = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        notesByMonth[key] = 0;
      }

      rawData.forEach((note) => {
        const key = `${new Date(note.created_at).getFullYear()}-${String(new Date(note.created_at).getMonth() + 1).padStart(2, "0")}`;
        if (Object.prototype.hasOwnProperty.call(notesByMonth, key))
          notesByMonth[key]++;
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      res.status(200).json({
        status: "OK",
        message: "Resumo de backup gerado com sucesso",
        generated_at: new Date().toISOString(),
        details: {
          summary,
          notes_by_month: notesByMonth,
          recent_activity: {
            notes_created: rawData.filter(
              (n) => new Date(n.created_at) > thirtyDaysAgo
            ).length,
            notes_updated: rawData.filter(
              (n) => new Date(n.updated_at) > thirtyDaysAgo
            ).length,
          },
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new BackupSummaryController();
