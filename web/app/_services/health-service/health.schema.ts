import { z } from "zod";

/** JSON body from GET /health before client adds `responseTime`. */
export const HealthPayloadSchema = z
  .object({
    status: z.enum(["online", "offline"]),
    timestamp: z.string(),
    uptime: z.number(),
    service: z.string(),
  })
  .passthrough();

export type HealthPayload = z.infer<typeof HealthPayloadSchema>;
