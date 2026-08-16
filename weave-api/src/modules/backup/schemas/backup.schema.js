const { z } = require("zod");

/**
 * Validates the request parameters for downloading a backup.
 */
const downloadBackupSchema = z.object({
  token: z
    .string()
    .min(1, "Token is required")
    .describe("O token de segurança necessário para autenticar o download do backup."),
});

/**
 * Validates the request parameters for getting a backup job status.
 */
const backupJobStatusSchema = z.object({
  jobId: z
    .string()
    .uuid("Invalid job ID format")
    .describe(
      "O identificador único (UUID) do trabalho de backup cujo status está sendo consultado."
    ),
});

const triggerBackupSchema = z.object({});
const listBackupsSchema = z.object({});

module.exports = {
  backupJobStatusSchema,
  downloadBackupSchema,
  listBackupsSchema,
  triggerBackupSchema,
};
