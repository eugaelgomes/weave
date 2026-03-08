import { apiClient, handleResponse, API_ENDPOINTS } from "../api-methods";

const HEALTH_CHECK_URL = process.env.BASE_HEALTH_CHECK_URL || "http://localhost:8080";

export interface HealthStatus {
  status: "online" | "offline";
  timestamp: string;
  uptime: number;
  service: string;
  responseTime: number;
}

export async function checkHealth(): Promise<HealthStatus> {
  const startTime = performance.now();

  try {
    // Extrai "http://localhost:8080" do "http://localhost:8080/api/v1"
    const globalOrigin = new URL(HEALTH_CHECK_URL).origin;
    const response = await fetch(`${HEALTH_CHECK_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

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
