import { z } from "zod";
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import {
  BackupJobSchema,
  BackupRequestResponseSchema,
  BackupSummarySchema,
  type BackupJob,
  type BackupRequestResponse,
  type BackupSummary,
} from "./backup.schema";

export type { BackupJob, BackupRequestResponse, BackupSummary };

export interface BackupOptions {
  includeBlocks?: boolean;
  includeProjects?: boolean;
  format?: "json" | "zip";
}

export async function requestBackup(options: BackupOptions = {}): Promise<BackupRequestResponse> {
  const response = await apiClient.post(API_ENDPOINTS.BACKUP_REQUEST, {
    includeBlocks: options.includeBlocks ?? true,
    includeProjects: options.includeProjects ?? true,
    format: options.format ?? "json",
  });

  const raw = await handleResponse<unknown>(response);
  return BackupRequestResponseSchema.parse(raw);
}

export async function getBackupStatus(jobId: string): Promise<BackupJob> {
  const response = await apiClient.get(API_ENDPOINTS.BACKUP_STATUS(jobId));
  const raw = await handleResponse<unknown>(response);
  return BackupJobSchema.parse(raw);
}

export async function getUserBackupJobs(): Promise<BackupJob[]> {
  const response = await apiClient.get(API_ENDPOINTS.BACKUP_JOBS);
  const raw = await handleResponse<unknown>(response);
  return z.array(BackupJobSchema).parse(raw);
}

export async function getBackupSummary(): Promise<BackupSummary> {
  const response = await apiClient.get(API_ENDPOINTS.BACKUP_SUMMARY);
  const raw = await handleResponse<unknown>(response);
  return BackupSummarySchema.parse(raw);
}
