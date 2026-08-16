import { z } from "zod";

const MetricSchema = z.object({
  used: z.number(),
  limit: z.number().nullable(),
  remaining: z.number().nullable(),
  percentage: z.number().nullable(),
});

const ComparisonSchema = z.object({
  delta: z.number(),
  variation_percent: z.number().nullable(),
});

export const UsageMetricsSchema = z.object({
  notes_total: MetricSchema,
  projects_total: MetricSchema,
  team_members_total: MetricSchema,
  exports_notes_monthly: MetricSchema,
  backups_monthly: MetricSchema,
  weave_ai_messages_monthly: MetricSchema,
  storage_uploaded_mb_monthly: MetricSchema,
});

export const PlanUsageHistoryItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  period_start: z.string().nullable(),
  period_end: z.string().nullable(),
  closed_at: z.string().nullable(),
  plan: z.object({
    id: z
      .union([z.string(), z.number(), z.null()])
      .transform((v) => (v == null ? null : String(v))),
    name: z.string().nullable(),
  }),
  metrics: UsageMetricsSchema,
  totals: z.object({
    notes_created_period: z.number(),
    projects_created_period: z.number(),
    ai_messages_period: z.number(),
    storage_uploaded_mb_period: z.number(),
    exports_period: z.number(),
  }),
  percentage_total: z.number().nullable(),
  comparison_vs_previous: z.record(z.string(), ComparisonSchema).default({}),
});

export const PlanUsageCurrentPeriodSchema = z.object({
  period_start: z.string().nullable(),
  period_end: z.string().nullable(),
  plan: z.object({
    id: z
      .union([z.string(), z.number(), z.null()])
      .transform((v) => (v == null ? null : String(v))),
    name: z.string().nullable(),
    client_type: z.string().nullable(),
  }),
  metrics: UsageMetricsSchema,
  percentage_total: z.number().nullable(),
  as_of: z.string(),
});

export const PlanUsageHistoryResponseSchema = z.object({
  current_period: PlanUsageCurrentPeriodSchema,
  history: z.array(PlanUsageHistoryItemSchema),
  pagination: z.object({
    limit: z.number(),
    offset: z.number(),
    has_more: z.boolean(),
    returned: z.number(),
  }),
});

export type UsageMetric = z.infer<typeof MetricSchema>;
export type UsageMetrics = z.infer<typeof UsageMetricsSchema>;
export type UsageComparison = z.infer<typeof ComparisonSchema>;
export type PlanUsageCurrentPeriod = z.infer<typeof PlanUsageCurrentPeriodSchema>;
export type PlanUsageHistoryItem = z.infer<typeof PlanUsageHistoryItemSchema>;
export type PlanUsageHistoryResponse = z.infer<typeof PlanUsageHistoryResponseSchema>;
