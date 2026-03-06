import { request } from "@/app/services/api";

export interface DashboardStats {
  // Contagens gerais
  total_users: string;
  verified_users: string;
  deleted_users: string;
  total_organizations: string;
  total_projects: string;
  total_notes: string;
  new_users_30d: string;
  new_orgs_30d: string;
  // Métricas de uso (plans_usage)
  active_subscriptions: string;
  usage_ai_messages_total: string;
  usage_storage_total_mb: string;
  usage_exports_notes_total: string;
  usage_exports_backups_total: string;
  usage_avg_percentage: string;
}

export async function getDashboard(): Promise<{ stats: DashboardStats }> {
  return request("/admin/dashboard");
}
