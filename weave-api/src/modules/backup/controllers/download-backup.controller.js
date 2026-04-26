const BackupBaseController = require("./base.controller");
const BackupDownloadTokensRepository = require("@/modules/backup/repositories/backup-download-tokens.repository");
const storageService = require("@/services/storage/index");

/**
 * Download público por token (rota sem `verifyToken`).
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

      if (!token) {
        return res.status(400).json({
          status: "Bad Request",
          error: "Token não fornecido",
        });
      }

      const tokenRecord =
        await BackupDownloadTokensRepository.getTokenWithJob(token);

      if (!tokenRecord) {
        return res.status(404).json({
          status: "Not Found",
          error: "Token inválido ou já utilizado",
          message: "O link de download não é válido ou já foi usado",
        });
      }

      if (new Date() > new Date(tokenRecord.expires_at)) {
        return res.status(410).json({
          status: "Gone",
          error: "Token expirado",
          message: "O link de download expirou. Solicite um novo backup.",
        });
      }

      if (req.user?.userId && req.user.userId !== tokenRecord.user_id) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Acesso negado",
          message: "Você não tem permissão para acessar este backup",
        });
      }

      const result = tokenRecord.result;
      if (!result || !result.storageKey) {
        return res.status(500).json({
          status: "Internal Server Error",
          error: "Backup não encontrado no storage",
          message: "Não foi possível localizar o arquivo de backup",
        });
      }

      const storageKey = result.storageKey;
      const fileName = `backup_${tokenRecord.user_id}_${Date.now()}.csv`;

      const fileContent = await storageService.downloadFile(storageKey);

      if (!fileContent) {
        return res.status(500).json({
          status: "Internal Server Error",
          error: "Falha ao recuperar arquivo do storage",
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
      console.error("Erro no download de backup:", error);
      this._handleError(error, res, next);
    }
  }
}

module.exports = new DownloadBackupController();
