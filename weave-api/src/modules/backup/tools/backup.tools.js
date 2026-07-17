const backupJobsRepository = require("@/modules/backup/repositories/backup-jobs.repository");
const {
  triggerBackupSchema,
  listBackupsSchema,
  backupJobStatusSchema,
} = require("../schemas/backup.schema");

/**
 * Creates the Backup tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The backup tools definition map.
 */
const createBackupTools = (user) => ({
  get_backup_status: {
    description: "Retrieve the current status of a specific backup job.",
    handler: async (args) => {
      try {
        const job = await backupJobsRepository.getJob(args.jobId);
        if (!job || job.userId !== user.userId) {
          return {
            content: [
              { text: "Job not found or access denied.", type: "text" },
            ],
            isError: true,
          };
        }
        return {
          content: [{ text: JSON.stringify(job, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error retrieving backup status: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "get_backup_status",
    schema: backupJobStatusSchema,
  },
  list_backups: {
    description: "List all backup jobs initiated by the user.",
    handler: async () => {
      try {
        const jobs = await backupJobsRepository.getUserJobs(user.userId);
        return {
          content: [{ text: JSON.stringify(jobs, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error listing backups: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "list_backups",
    schema: listBackupsSchema,
  },
  trigger_backup: {
    description: "Trigger a new backup job for the user data.",
    handler: async () => {
      try {
        const job = await backupJobsRepository.createJob(
          "user_backup",
          user.userId,
          {}
        );
        return {
          content: [{ text: JSON.stringify(job, null, 2), type: "text" }],
        };
      } catch (error) {
        return {
          content: [
            { text: `Error triggering backup: ${error.message}`, type: "text" },
          ],
          isError: true,
        };
      }
    },
    name: "trigger_backup",
    schema: triggerBackupSchema,
  },
});

module.exports = {
  createBackupTools,
};
