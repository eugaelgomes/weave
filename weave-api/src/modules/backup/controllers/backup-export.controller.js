const BackupBaseController = require("./base.controller");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const backupJobsRepository = require("@/modules/backup/repositories/backup-jobs.repository");
const PlansRepository = require("@/modules/plans/plans.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const { enqueueBackupExportJob } = require("@/services/queue/queue-controller");

/**
 * Pedido de backup assíncrono e execução do job (CSV, storage, e-mail).
 */
class BackupExportController extends BackupBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async requestBackup(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!this._validateUserId(userId)) {
        return res.status(400).json({
          status: "Bad Request",
          error: "ID de usuário inválido",
          message: "O formato do ID de usuário não é válido",
        });
      }

      const userPlan = await PlansRepository.getUserWithPlan(userId);
      if (!userPlan || !userPlan.plan_id) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Plano não encontrado",
          message: "Você precisa ter um plano ativo para solicitar backups",
        });
      }

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const planDetails = await PlansRepository.getPlanById(userPlan.plan_id);
      const appliedPlanDetails =
        usageRecord?.applied_plan_snapshot || userPlan.plan_details || planDetails?.details;

      const canBackup = PlanUsageManager.checkLimit(
        appliedPlanDetails,
        usageRecord.usage_details,
        USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT,
        PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
      );

      if (!canBackup) {
        const currentUsage = PlanUsageManager.getNestedValue(
          usageRecord.usage_details,
          USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        );
        const limit = PlanUsageManager.getNestedValue(
          appliedPlanDetails,
          PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
        );

        return res.status(406).json({
          status: "Too Many Requests",
          message: `Você atingiu o limite de ${limit} backup(s) por mês do seu plano ${planDetails.name}`,
          details: {
            current_usage: currentUsage,
            monthly_limit: limit,
            plan_name: planDetails.name,
            period_end: PlanUsageManager.getNestedValue(
              usageRecord.usage_details,
              USAGE_PATHS.MONTHLY.PERIOD_END
            ),
          },
        });
      }

      const existingJobs = await backupJobsRepository.getUserJobs(userId);
      const activeJob = existingJobs.find(
        (job) =>
          job.type === "backup_export" &&
          ["pending", "processing"].includes(job.status)
      );

      if (activeJob) {
        return res.status(409).json({
          status: "Conflict",
          error: "Backup já em andamento",
          message:
            "Aguarde a conclusão do backup atual antes de solicitar outro",
          details: {
            job_id: activeJob.id,
            backup_status: activeJob.status,
            progress: activeJob.progress,
          },
        });
      }

      const user = await SearchUsersRepository.getUserById(userId);
      if (!user)
        return res.status(404).json({
          status: "Not Found",
          error: "Usuário não encontrado",
        });

      const job = await backupJobsRepository.createJob("backup_export", userId, {
        email: user.email,
        username: user.name || user.username,
        requestedAt: new Date().toISOString(),
      });

      await PlanUsageManager.consumeExport(usageRecord.id, "backup");

      await enqueueBackupExportJob({ jobId: job.id, userId });

      const updatedUsage =
        PlanUsageManager.getNestedValue(
          usageRecord.usage_details,
          USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        ) + 1;
      const monthlyLimit = PlanUsageManager.getNestedValue(
        appliedPlanDetails,
        PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
      );

      res.status(202).json({
        status: "OK",
        job_id: job.id,
        message:
          "Backup solicitado com sucesso! Você receberá um email quando estiver pronto.",
        details: {
          backup_status: "pending",
          estimated_time: "2-5 minutos",
          user_email: user.email,
          created_at: job.createdAt,
          usage: {
            backups_used: updatedUsage,
            backups_limit: monthlyLimit,
            remaining: monthlyLimit - updatedUsage,
          },
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new BackupExportController();
