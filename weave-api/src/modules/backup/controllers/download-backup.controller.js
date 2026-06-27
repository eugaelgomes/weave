const BackupBaseController = require("./base.controller");
const BackupDownloadTokensRepository = require("@/modules/backup/repositories/backup-download-tokens.repository");
const storageService = require("@/services/storage/index");

/**
 * Public download by token (route without `verifyToken`).
 */
class DownloadBackupController extends BackupBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async downloadBackup(req, res, next) {
    try {
      const { token } = req.params;

      const tokenRecord =
        await BackupDownloadTokensRepository.getTokenWithJob(token);

      if (!tokenRecord) {
        return res.status(404).json({
          status: "Not Found",
          error: "Invalid or already used token",
          message: "The download link is invalid or has already been used",
        });
      }

      if (new Date() > new Date(tokenRecord.expires_at)) {
        return res.status(410).json({
          status: "Gone",
          error: "Expired token",
          message:
            "The download link has expired. Please request a new backup.",
        });
      }

      if (req.user?.userId && req.user.userId !== tokenRecord.user_id) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Access denied",
          message: "You do not have permission to access this backup",
        });
      }

      const result = tokenRecord.result;
      if (!result || !result.storageKey) {
        return res.status(500).json({
          status: "Internal Server Error",
          error: "Backup not found in storage",
          message: "Could not locate the backup file",
        });
      }

      const storageKey = result.storageKey;
      const fileName = `backup_${tokenRecord.user_id}_${Date.now()}.csv`;

      const fileContent = await storageService.downloadFile(storageKey);

      if (!fileContent) {
        return res.status(500).json({
          status: "Internal Server Error",
          error: "Failed to retrieve file from storage",
        });
      }

      await BackupDownloadTokensRepository.markTokenAsUsed(token);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );
      res.setHeader("Content-Length", fileContent.length);
      res.send(fileContent);
    } catch (error) {
      console.error("Error downloading backup:", error);
      this._handleError(error, res, next);
    }
  }
}

module.exports = new DownloadBackupController();
