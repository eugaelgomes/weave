const crypto = require("crypto");

const BackupBaseController = require("./base.controller");
const FetchBackupDataRepository = require("@/modules/backup/repositories/fetch-backup-data.repository");
const BackupDownloadTokensRepository = require("@/modules/backup/repositories/backup-download-tokens.repository");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const jobManager = require("@/services/jobs/index");
const {
  sendBackupEmail,
} = require("@/services/email/templates/backup-notification");
const PlansRepository = require("@/modules/plans/plans.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const storageService = require("@/services/storage/index");

/**
 * Pedido de backup assíncrono e execução do job (CSV, storage, e-mail).
 */
class BackupExportController extends BackupBaseController {
  /**
   * @param {string} jobId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async _executeBackupJob(jobId, userId) {
    try {
      const usageBackupsJobs = await jobManager.getUserJobs(userId);
      const activeUsageJob = usageBackupsJobs.find(
        (job) =>
          job.type === "backup_export_usage" &&
          ["pending", "processing"].includes(job.status)
      );

      if (activeUsageJob) {
        throw new Error(
          "Já existe um job de backup de uso em andamento. Aguarde a conclusão antes de iniciar outro."
        );
      }

      await jobManager.updateJob(jobId, {
        status: "processing",
        progress: 10,
      });

      const user = await SearchUsersRepository.getUserById(userId);
      if (!user) throw new Error("Usuário não encontrado");

      await jobManager.updateJob(jobId, { progress: 20 });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Timeout: Backup demorou mais que 5 minutos")),
          5 * 60 * 1000
        );
      });

      const dataPromise = FetchBackupDataRepository.getAllData(userId);
      const rawData = await Promise.race([dataPromise, timeoutPromise]);

      await jobManager.updateJob(jobId, { progress: 60 });

      const totalNotes = rawData.length;
      const totalBlocks = rawData.reduce(
        (sum, note) => sum + (note.blocks?.length || 0),
        0
      );

      if (totalNotes > 1000 || totalBlocks > 5000) {
        throw new Error(
          `Muitos dados para backup: ${totalNotes} notas, ${totalBlocks} blocos. Contate o suporte.`
        );
      }

      const backupData = this._formatBackupDataCSV(rawData);

      await jobManager.updateJob(jobId, { progress: 70 });

      const uploadResult = await storageService.uploadBackup(
        backupData,
        userId,
        `backup_${userId}_${Date.now()}.csv`
      );

      if (!uploadResult.success) {
        throw new Error("Falha ao fazer upload do backup para o storage");
      }

      await jobManager.updateJob(jobId, { progress: 80 });

      const downloadToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await BackupDownloadTokensRepository.createDownloadToken(
        downloadToken,
        userId,
        "backup_download",
        expiresAt
      );

      await jobManager.updateJob(jobId, { progress: 90 });

      const downloadUrl = `${process.env.API_URL || "http://localhost:8080"}/api/backup/download/${downloadToken}`;
      const emailResult = await sendBackupEmail(
        user.email,
        user.name || user.username,
        downloadUrl,
        expiresAt
      );

      if (!emailResult.success) {
        throw new Error(
          `Falha ao enviar email: ${emailResult.error || "Erro desconhecido"}`
        );
      }

      await NotificationsRepository.createNotification({
        userId: userId,
        actorId: userId,
        type: "job_action",
        entityType: "job",
        entityId: jobId,
        title:
          "Seu backup foi concluído com sucesso e está pronto para download",
        content: {
          action: "backup_completed",
          download_url: downloadUrl,
          expires_at: expiresAt,
        },
      });

      await jobManager.updateJob(jobId, {
        status: "completed",
        progress: 100,
        result: {
          totalNotes,
          fileSize: uploadResult.size,
          storageKey: uploadResult.key,
          downloadToken: downloadToken,
          expiresAt: expiresAt.toISOString(),
          emailSent: emailResult.success,
          completedAt: new Date().toISOString(),
        },
      });

      console.log(`Backup job ${jobId} concluído para usuário ${userId}`);
    } catch (error) {
      console.error(`Erro no backup job ${jobId}:`, error);
      await jobManager.updateJob(jobId, {
        status: "failed",
        error: error.message,
        progress: 0,
      });
    }
  }

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

      const planDetails = await PlansRepository.getPlanById(userPlan.plan_id);
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);

      const canBackup = PlanUsageManager.checkLimit(
        planDetails.details,
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
          planDetails.details,
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

      const existingJobs = await jobManager.getUserJobs(userId);
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

      const job = await jobManager.createJob("backup_export", userId, {
        email: user.email,
        username: user.name || user.username,
        requestedAt: new Date().toISOString(),
      });

      await PlanUsageManager.consumeExport(usageRecord.id, "backup");

      setTimeout(() => this._executeBackupJob(job.id, userId), 100);

      const updatedUsage =
        PlanUsageManager.getNestedValue(
          usageRecord.usage_details,
          USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        ) + 1;
      const monthlyLimit = PlanUsageManager.getNestedValue(
        planDetails.details,
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
