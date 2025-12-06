// services/health-service/HealthService.ts
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-routes";

//
// --- Types ---
//
export interface HealthStatus {
  status: "online" | "offline";
  timestamp: string;
  uptime: number;
  service: string;
}

//
// --- Health API ---
//

export async function checkHealth(): Promise<HealthStatus> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.HEALTH);
    return await handleResponse<HealthStatus>(response);
  } catch {
    // Se falhar, retorna status offline
    return {
      status: "offline",
      timestamp: new Date().toISOString(),
      uptime: 0,
      service: "notes-api",
    };
  }
}
