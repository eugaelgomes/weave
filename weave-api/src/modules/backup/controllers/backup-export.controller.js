const BackupBaseController = require("./base.controller");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const backupJobsRepository = require("@/modules/backup/repositories/backup-jobs.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const PlanUsageManager = require("@/modules/plans/controllers/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const { enqueueBackupExportJob } = require("@/services/queue/queue-controller");

/**
 * Asynchronous backup request and job execution (CSV, storage, e-mail).
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
          error: "Invalid user ID",
          message: "The user ID format is invalid",
        });
      }

      const userPlan = await PlansRepository.getUserWithPlan(userId);
      if (!userPlan || !userPlan.plan_id) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Plan not found",
          message: "You must have an active plan to request backups",
        });
      }

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const planDetails = await PlansRepository.getPlanById(userPlan.plan_id);
      const appliedPlanDetails =
        usageRecord?.applied_plan_snapshot ||
        userPlan.plan_details ||
        planDetails?.details;

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
          message: `You have reached the limit of ${limit} backup(s) per month for your ${planDetails.name} plan`,
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
          error: "Backup already in progress",
          message:
            "Please wait for the current backup to complete before requesting another",
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
          error: "User not found",
        });

      const job = await backupJobsRepository.createJob(
        "backup_export",
        userId,
        {
          email: user.email,
          username: user.name || user.username,
          requestedAt: new Date().toISOString(),
        }
      );

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
          "Backup requested successfully! You will receive an email when it is ready.",
        details: {
          backup_status: "pending",
          estimated_time: "2-5 minutes",
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
