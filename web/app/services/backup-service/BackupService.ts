// services/backup-service/BackupService.ts
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";

//
// --- Types ---
//
export interface BackupSummary {
  totalNotes: number;
  totalBlocks: number;
  totalProjects?: number;
  estimatedSize?: string;
}

export interface BackupJob {
  job_id?: string;
  jobId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt?: string;
  created_at?: string;
  completedAt?: string;
  downloadUrl?: string;
  download_url?: string;
  error?: string;
  progress?: number;
}

export interface BackupRequestResponse {
  message: string;
  job_id: string;
  status: string;
  estimated_time?: string;
  user_email?: string;
  created_at?: string;
}

export interface BackupOptions {
  includeBlocks?: boolean;
  includeProjects?: boolean;
  format?: "json" | "zip";
}

//
// --- Backup API ---
//

// Solicitar um novo backup
export async function requestBackup(options: BackupOptions = {}): Promise<BackupRequestResponse> {
  const response = await apiClient.post(API_ENDPOINTS.BACKUP_REQUEST, {
    includeBlocks: options.includeBlocks ?? true,
    includeProjects: options.includeProjects ?? true,
    format: options.format ?? "json",
  });

  return await handleResponse<BackupRequestResponse>(response);
}

// Verificar status de um job de backup
export async function getBackupStatus(jobId: string): Promise<BackupJob> {
  const response = await apiClient.get(API_ENDPOINTS.BACKUP_STATUS(jobId));
  return await handleResponse<BackupJob>(response);
}

// Listar todos os jobs de backup do usuário
export async function getUserBackupJobs(): Promise<BackupJob[]> {
  const response = await apiClient.get(API_ENDPOINTS.BACKUP_JOBS);
  return await handleResponse<BackupJob[]>(response);
}

// Obter resumo dos dados para backup
export async function getBackupSummary(): Promise<BackupSummary> {
  const response = await apiClient.get(API_ENDPOINTS.BACKUP_SUMMARY);
  return await handleResponse<BackupSummary>(response);
}

// Função utilitária para baixar o backup como arquivo
//export function downloadBackupFile(data: BackupData, filename?: string): void {
//  const jsonString = JSON.stringify(data, null, 2);
//  const blob = new Blob([jsonString], { type: "application/json" });
//  const url = URL.createObjectURL(blob);
//
//  const a = document.createElement("a");
//  a.href = url;
//  a.download = filename || `backup-${new Date().toISOString().split("T")[0]}.json`;
//  document.body.appendChild(a);
//  a.click();
//  document.body.removeChild(a);
//  URL.revokeObjectURL(url);
//}
