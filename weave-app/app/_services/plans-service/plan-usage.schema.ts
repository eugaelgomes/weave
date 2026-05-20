import { z } from "zod";

export const PlanGateSchema = z.object({
  allowed: z.boolean(),
  current: z.number(),
  limit: z.number().nullable(),
});

export const PlanMeResponseSchema = z.object({
  plan: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    client_type: z.string().nullable(),
  }),
  usage_period: z.object({
    plan_id: z
      .union([z.string(), z.number(), z.null()])
      .transform((v) => (v == null ? null : String(v))),
    period_start: z.string().nullable(),
    period_end: z.string().nullable(),
  }),
  usage_summary: z.object({
    notes_total: z.number(),
    projects_total: z.number(),
    team_members_total: z.number(),
    exports_notes_monthly: z.number(),
    backups_monthly: z.number(),
    weave_ai_messages_monthly: z.number(),
    storage_uploaded_mb_monthly: z.number(),
  }),
  gates: z.object({
    notes: PlanGateSchema,
    projects: PlanGateSchema,
    team_members: PlanGateSchema,
    exports_notes_monthly: PlanGateSchema,
    backups_monthly: PlanGateSchema,
    weave_ai_messages_monthly: PlanGateSchema,
    storage_upload_mb_monthly: PlanGateSchema,
  }),
  plan_details: z.record(z.string(), z.unknown()).optional(),
  as_of: z.string(),
});

export type PlanMeResponse = z.infer<typeof PlanMeResponseSchema>;
export type PlanGate = z.infer<typeof PlanGateSchema>;
