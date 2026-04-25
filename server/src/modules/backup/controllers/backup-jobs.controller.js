const BackupBaseController = require("./base.controller");
const backupJobsRepository = require("@/modules/backup/repositories/backup-jobs.repository");

/**
 * Estado e histórico de jobs de backup.
 */
class BackupJobsController extends BackupBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async getBackupStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const job = await backupJobsRepository.getJob(jobId);
      if (!job)
        return res.status(404).json({
          status: "Not Found",
          error: "Job não encontrado",
          message: "O job solicitado não existe ou expirou",
        });

      if (job.userId !== userId) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Acesso negado a este job",
          message: "Você não tem permissão para acessar este job",
        });
      }

      const elapsedMinutes = Math.floor(
        (new Date() - new Date(job.createdAt)) / (1000 * 60)
      );

      res.status(200).json({
        status: "OK",
        job_id: job.id,
        message: "Status do backup recuperado com sucesso",
        details: {
          backup_status: job.status,
          progress: job.progress,
          created_at: job.createdAt,
          started_at: job.startedAt,
          completed_at: job.completedAt,
          elapsed_time: `${elapsedMinutes} minuto${elapsedMinutes !== 1 ? "s" : ""}`,
          error: job.error,
          result: job.result,
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async getUserBackupJobs(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const jobs = (await backupJobsRepository.getUserJobs(userId))
        .filter((job) => job.type === "backup_export")
        .slice(0, 10);

      res.status(200).json({
        status: "OK",
        message: "Histórico de backups recuperado com sucesso",
        total: jobs.length,
        details: {
          jobs: jobs.map((job) => ({
            job_id: job.id,
            status: job.status,
            progress: job.progress,
            created_at: job.createdAt,
            completed_at: job.completedAt,
            error: job.error ? job.error.substring(0, 100) : null,
            result: job.result
              ? {
                  totalNotes: job.result.totalNotes,
                  fileSize: job.result.fileSize,
                }
              : null,
          })),
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new BackupJobsController();
