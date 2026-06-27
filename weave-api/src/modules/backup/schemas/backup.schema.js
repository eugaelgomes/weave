const { z } = require("zod");

/**
 * Validates the request parameters for downloading a backup.
 */
const downloadBackupSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

/**
 * Validates the request parameters for getting a backup job status.
 */
const backupJobStatusSchema = z.object({
  jobId: z.string().uuid("Invalid job ID format"),
});

module.exports = {
  downloadBackupSchema,
  backupJobStatusSchema,
};
