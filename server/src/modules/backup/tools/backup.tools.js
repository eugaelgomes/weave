const { z } = require("zod");
const backupJobsRepository = require("@/modules/backup/repositories/backup-jobs.repository");

const manageBackupsSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("trigger"),
  }),
  z.object({
    action: z.literal("list"),
  }),
  z.object({
    action: z.literal("get_status"),
    jobId: z.string().uuid().describe("ID of the backup job"),
  }),
]);

const createBackupTools = (user) => ({
  manage_backups: {
    description: "Manage data backups (trigger, get_status, list).",
    handler: async (args) => {
      try {
        const { action, jobId } = args;

        if (action === "trigger") {
          const job = await backupJobsRepository.createJob("user_backup", user.userId, {});
          return {
            content: [{ text: JSON.stringify(job, null, 2), type: "text" }],
          };
        }

        if (action === "list") {
          const jobs = await backupJobsRepository.getUserJobs(user.userId);
          return {
            content: [{ text: JSON.stringify(jobs, null, 2), type: "text" }],
          };
        }

        if (action === "get_status") {
          if (!jobId) throw new Error("jobId is required for get_status action.");
          const job = await backupJobsRepository.getJob(jobId);
          if (!job || job.userId !== user.userId)
            throw new Error("Job not found or access denied.");
          return {
            content: [{ text: JSON.stringify(job, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [{ text: `Error managing backups: ${error.message}`, type: "text" }],
          isError: true,
        };
      }
    },
    name: "manage_backups",
    schema: manageBackupsSchema,
  },
});

module.exports = {
  createBackupTools,
};
