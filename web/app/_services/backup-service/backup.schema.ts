import { z } from "zod";

export const BackupSummarySchema = z
  .object({
    totalNotes: z.number(),
    totalBlocks: z.number(),
    totalProjects: z.number().optional(),
    estimatedSize: z.string().optional(),
  })
  .passthrough();

const backupJobStatus = z.enum(["pending", "processing", "completed", "failed"]);

/** Accepts both snake_case and camelCase keys from the API. */
export const BackupJobSchema = z
  .object({
    job_id: z.string().optional(),
    jobId: z.string().optional(),
    status: backupJobStatus,
    createdAt: z.string().optional(),
    created_at: z.string().optional(),
    completedAt: z.string().optional(),
    downloadUrl: z.string().optional(),
    download_url: z.string().optional(),
    error: z.string().optional(),
    progress: z.number().optional(),
  })
  .passthrough();

export const BackupRequestResponseSchema = z
  .object({
    message: z.string(),
    job_id: z.string(),
    status: z.string(),
    estimated_time: z.string().optional(),
    user_email: z.string().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();

export type BackupSummary = z.infer<typeof BackupSummarySchema>;
export type BackupJob = z.infer<typeof BackupJobSchema>;
export type BackupRequestResponse = z.infer<typeof BackupRequestResponseSchema>;
