import type { User } from "@/app/_services/authentication/auth.schema";
import type { PlanGate, PlanMeResponse } from "@/app/_services/plans-service/plan-usage.schema";

function getNested(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function gateFrom(
  planDetails: unknown,
  usageDetails: unknown,
  usagePath: string,
  limitPath: string
): PlanGate {
  const rawCurrent = getNested(usageDetails, usagePath);
  const rawLimit = getNested(planDetails, limitPath);
  const currentNum = rawCurrent === null || rawCurrent === undefined ? 0 : Number(rawCurrent);
  const current = Number.isFinite(currentNum) ? currentNum : 0;

  if (rawLimit === null || rawLimit === undefined) {
    return { allowed: true, current, limit: null };
  }
  const limitNum = Number(rawLimit);
  if (!Number.isFinite(limitNum)) {
    return { allowed: true, current, limit: null };
  }
  return {
    allowed: current < limitNum,
    current,
    limit: limitNum,
  };
}

/** Mirrors `plan-paths` usage for client-side fallback when `/plans/me` has not synced yet. */
export function localGatesFromUser(user: User | null): PlanMeResponse["gates"] | null {
  if (!user?.plan_details || !user.usage_details) return null;
  const planDetails = user.plan_details;
  const ud = user.usage_details;

  return {
    notes: gateFrom(planDetails, ud, "usage_summary.notes_total", "limits.max_notes"),
    projects: gateFrom(planDetails, ud, "usage_summary.projects_total", "limits.max_projects"),
    team_members: gateFrom(
      planDetails,
      ud,
      "usage_summary.team_members_total",
      "limits.max_team_members"
    ),
    exports_notes_monthly: gateFrom(
      planDetails,
      ud,
      "monthly_cycle.exports.notes_count",
      "limits.exports.notes_monthly"
    ),
    backups_monthly: gateFrom(
      planDetails,
      ud,
      "monthly_cycle.exports.backups_count",
      "limits.exports.backups_monthly"
    ),
    weave_ai_messages_monthly: gateFrom(
      planDetails,
      ud,
      "monthly_cycle.weave_ai.messages_sent",
      "weave_ai.config.monthly_messages"
    ),
    storage_upload_mb_monthly: gateFrom(
      planDetails,
      ud,
      "monthly_cycle.storage.total_uploaded_mb",
      "limits.storage.total_monthly_upload_mb"
    ),
  };
}
