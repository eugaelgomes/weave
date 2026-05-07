import { handleResponse } from "../api-methods";
import { HealthPayloadSchema, type HealthPayload } from "./health.schema";

const HEALTH_CHECK_URL = process.env.BASE_HEALTH_CHECK_URL || "http://localhost:8080";

export type HealthStatus = HealthPayload & { responseTime: number };

export async function checkHealth(): Promise<HealthStatus> {
  const startTime = performance.now();

  try {
    const response = await fetch(`${HEALTH_CHECK_URL}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    const raw = await handleResponse<unknown>(response);
    const data = HealthPayloadSchema.parse(raw);
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
