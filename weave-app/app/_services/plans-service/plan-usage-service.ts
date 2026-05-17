import type { User } from "@/app/_services/authentication/auth.schema";
import { apiClient, API_ENDPOINTS, handleResponse } from "@/app/_services/api-methods";
import { PlanMeResponseSchema, type PlanMeResponse } from "./plan-usage.schema";
import {
  PlanUsageHistoryResponseSchema,
  type PlanUsageHistoryResponse,
} from "./plan-usage-history.schema";

export type { PlanMeResponse, PlanGate } from "./plan-usage.schema";
export type {
  PlanUsageCurrentPeriod,
  PlanUsageHistoryItem,
  PlanUsageHistoryResponse,
  UsageComparison,
  UsageMetric,
  UsageMetrics,
} from "./plan-usage-history.schema";

function mergeUsageDetails(
  prev: NonNullable<User["usage_details"]>,
  next: NonNullable<User["usage_details"]>
): NonNullable<User["usage_details"]> {
  return {
    ...prev,
    ...next,
    usage_summary: {
      ...prev.usage_summary,
      ...next.usage_summary,
    },
    monthly_cycle: {
      ...prev.monthly_cycle,
      ...next.monthly_cycle,
      exports: {
        ...prev.monthly_cycle?.exports,
        ...next.monthly_cycle?.exports,
      },
      storage: {
        ...prev.monthly_cycle?.storage,
        ...next.monthly_cycle?.storage,
      },
      weave_ai: {
        ...prev.monthly_cycle?.weave_ai,
        ...next.monthly_cycle?.weave_ai,
      },
    },
    history_metadata: {
      ...prev.history_metadata,
      ...next.history_metadata,
    },
  };
}

/**
 * Patch `User` plan/usage fields from lean `GET /plans/me` (for mergeUser).
 */
export function buildUserPatchFromPlanMe(payload: PlanMeResponse): Partial<User> {
  const usage_details: NonNullable<User["usage_details"]> = {
    usage_summary: {
      notes_total: payload.usage_summary.notes_total,
      projects_total: payload.usage_summary.projects_total,
      team_members_total: payload.usage_summary.team_members_total,
    },
    monthly_cycle: {
      current_period_start: payload.usage_period.period_start ?? undefined,
      current_period_end: payload.usage_period.period_end ?? undefined,
      exports: {
        notes_count: payload.usage_summary.exports_notes_monthly,
        backups_count: payload.usage_summary.backups_monthly,
      },
      weave_ai: {
        messages_sent: payload.usage_summary.weave_ai_messages_monthly,
      },
      storage: {
        total_uploaded_mb: payload.usage_summary.storage_uploaded_mb_monthly,
      },
    },
  };

  return {
    plan_id: payload.plan.id,
    plan_name: payload.plan.name,
    plan_client_type: payload.plan.client_type ?? undefined,
    usage_plan_id: payload.usage_period.plan_id ?? undefined,
    usage_period_start: payload.usage_period.period_start ?? undefined,
    usage_period_end: payload.usage_period.period_end ?? undefined,
    usage_details,
  };
}

export async function fetchPlanUsageMe(): Promise<PlanMeResponse> {
  const response = await apiClient.get(API_ENDPOINTS.PLANS_ME);
  const raw = await handleResponse<unknown>(response);
  return PlanMeResponseSchema.parse(raw);
}

export type FetchPlanUsageHistoryParams = {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
};

export async function fetchPlanUsageHistory(
  params: FetchPlanUsageHistoryParams = {}
): Promise<PlanUsageHistoryResponse> {
  const query = new URLSearchParams();
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);

  const endpoint = query.size
    ? `${API_ENDPOINTS.PLANS_USAGE_HISTORY}?${query.toString()}`
    : API_ENDPOINTS.PLANS_USAGE_HISTORY;

  const response = await apiClient.get(endpoint);
  const raw = await handleResponse<unknown>(response);
  return PlanUsageHistoryResponseSchema.parse(raw);
}

export { mergeUsageDetails };
