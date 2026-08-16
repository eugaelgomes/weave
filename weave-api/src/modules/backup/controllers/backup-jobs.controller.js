const BackupBaseController = require("./base.controller");
const backupJobsRepository = require("@/modules/backup/repositories/backup-jobs.repository");

/**
 * Backup jobs status and history.
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
          error: "Job not found",
          message: "The requested job does not exist or has expired",
          status: "Not Found",
        });

      if (job.userId !== userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "You do not have permission to access this job",
          status: "Forbidden",
        });
      }

      const elapsedMinutes = Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60));

      res.status(200).json({
        details: {
          backup_status: job.status,
          completed_at: job.completedAt,
          created_at: job.createdAt,
          elapsed_time: `${elapsedMinutes} minute${elapsedMinutes !== 1 ? "s" : ""}`,
          error: job.error,
          progress: job.progress,
          result: job.result,
          started_at: job.startedAt,
        },
        job_id: job.id,
        message: "Backup status retrieved successfully",
        status: "OK",
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
        details: {
          jobs: jobs.map((job) => ({
            completed_at: job.completedAt,
            created_at: job.createdAt,
            error: job.error ? job.error.substring(0, 100) : null,
            job_id: job.id,
            progress: job.progress,
            result: job.result
              ? {
                  fileSize: job.result.fileSize,
                  totalNotes: job.result.totalNotes,
                }
              : null,
            status: job.status,
          })),
        },
        message: "Backup history retrieved successfully",
        status: "OK",
        total: jobs.length,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new BackupJobsController();
