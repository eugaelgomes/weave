import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";

export interface HealthStatus {
  status: "online" | "offline";
  timestamp: string;
  uptime: number;
  service: string;
  responseTime: number; // tempo de resposta em ms
}

export async function checkHealth(): Promise<HealthStatus> {
  const startTime = performance.now();

  try {
    const response = await apiClient.get(API_ENDPOINTS.HEALTH);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    const data = await handleResponse<Omit<HealthStatus, "responseTime">>(response);
    return {
      ...data,
      responseTime,
    };
  } catch {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    return {
      status: "offline",
      timestamp: new Date().toISOString(),
      uptime: 0,
      service: "notes-api",
      responseTime,
    };
  }
}
