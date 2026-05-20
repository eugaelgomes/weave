"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { SettingsPageShell } from "@/app/(protected)/settings/_components/settings-page-shell";
import {
  fetchPlanUsageHistory,
  type PlanUsageCurrentPeriod,
  type PlanUsageHistoryItem,
  type UsageMetric,
  type UsageMetrics,
} from "@/app/_services/plans-service/plan-usage-service";
import { CurrentUsageSummaryCard } from "./_components/current-usage-summary-card";
import { CurrentUsageBreakdown } from "./_components/current-usage-breakdown";
import { UsageHistoryTable } from "./_components/usage-history-table";

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildMetric(used: number, limit: number | null): UsageMetric {
  const percentage = limit === null || limit <= 0 ? null : Math.min((used / limit) * 100, 100);
  return {
    used,
    limit,
    remaining: limit === null ? null : Math.max(limit - used, 0),
    percentage: percentage === null ? null : Number(percentage.toFixed(2)),
  };
}

function buildMetricsFromUser(user: ReturnType<typeof useAuth>["user"]): UsageMetrics {
  const planLimits = user?.plan_details?.limits;
  const monthlyCycle = user?.usage_details?.monthly_cycle;
  const usageSummary = user?.usage_details?.usage_summary;
  const weaveAI = user?.plan_details?.weave_ai;

  return {
    notes_total: buildMetric(toNumber(usageSummary?.notes_total), planLimits?.max_notes ?? null),
    projects_total: buildMetric(
      toNumber(usageSummary?.projects_total),
      planLimits?.max_projects ?? null
    ),
    team_members_total: buildMetric(
      toNumber(usageSummary?.team_members_total),
      planLimits?.max_team_members ?? null
    ),
    exports_notes_monthly: buildMetric(
      toNumber(monthlyCycle?.exports?.notes_count),
      planLimits?.exports?.notes_monthly ?? null
    ),
    backups_monthly: buildMetric(
      toNumber(monthlyCycle?.exports?.backups_count),
      planLimits?.exports?.backups_monthly ?? null
    ),
    weave_ai_messages_monthly: buildMetric(
      toNumber(monthlyCycle?.weave_ai?.messages_sent),
      weaveAI?.config?.monthly_messages ?? null
    ),
    storage_uploaded_mb_monthly: buildMetric(
      toNumber(monthlyCycle?.storage?.total_uploaded_mb),
      planLimits?.storage?.total_monthly_upload_mb ?? null
    ),
  };
}

function computeTotalPercentage(metrics: UsageMetrics): number | null {
  const values = Object.values(metrics)
    .map((metric) => metric.percentage)
    .filter((value): value is number => value !== null);
  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Number((sum / values.length).toFixed(2));
}

export default function PlansSettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<PlanUsageHistoryItem[]>([]);
  const [historyCurrentPeriod, setHistoryCurrentPeriod] = useState<PlanUsageCurrentPeriod | null>(null);
  const [historyHasMore, setHistoryHasMore] = useState(false);

  const defaultMetrics = useMemo(() => buildMetricsFromUser(user), [user]);
  const currentMetrics = historyCurrentPeriod?.metrics ?? defaultMetrics;
  const totalPercentage =
    historyCurrentPeriod?.percentage_total ??
    user?.usage_details?.history_metadata?.usage_percentage_total ??
    computeTotalPercentage(currentMetrics);

  const featureLabels: Record<string, string> = {
    dark_mode: t.plansSettings.darkMode,
    custom_branding: t.plansSettings.customBranding,
    priority_support: t.plansSettings.prioritySupport,
    collaboration_tools: t.plansSettings.collaborationTools,
  };
  const planFeatures = user?.plan_details?.features;

  const loadHistory = useCallback(
    async (append: boolean) => {
      if (append) {
        setHistoryLoadingMore(true);
      } else {
        setHistoryLoading(true);
      }

      setHistoryError(null);
      try {
        const response = await fetchPlanUsageHistory({
          limit: 6,
          offset: append ? historyItems.length : 0,
        });

        setHistoryCurrentPeriod(response.current_period);
        setHistoryHasMore(response.pagination.has_more);
        setHistoryLoaded(true);
        setHistoryItems((prev) => (append ? [...prev, ...response.history] : response.history));
      } catch (error) {
        const message = error instanceof Error ? error.message : t.plansSettings.historyLoadError;
        setHistoryError(message);
      } finally {
        if (append) {
          setHistoryLoadingMore(false);
        } else {
          setHistoryLoading(false);
        }
      }
    },
    [historyItems.length]
  );

  const toggleHistory = useCallback(() => {
    setIsHistoryVisible((prev) => {
      const next = !prev;
      if (next && !historyLoaded && !historyLoading) {
        void loadHistory(false);
      }
      return next;
    });
  }, [historyLoaded, historyLoading, loadHistory]);

  return (
    <SettingsPageShell description={t.plansSettings.description}>
      <div className="flex flex-col gap-4 p-2">
        {!user?.plan_id ? (
          <p className="text-[12px] text-neutral-500">{t.plansSettings.noPlanFound}</p>
        ) : (
          <>
            <CurrentUsageSummaryCard
              planName={user.plan_name}
              periodStart={
                historyCurrentPeriod?.period_start ?? user?.usage_details?.monthly_cycle?.current_period_start
              }
              periodEnd={
                historyCurrentPeriod?.period_end ?? user?.usage_details?.monthly_cycle?.current_period_end
              }
              totalPercentage={totalPercentage}
              historyExpanded={isHistoryVisible}
              historyLoaded={historyLoaded}
              onToggleHistory={toggleHistory}
            />

            <CurrentUsageBreakdown metrics={currentMetrics} />

            <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm transition-all dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
              <div className="flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5 dark:border-surface-dark-border-muted">
                <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
                  <Zap size={13} className="text-amber-500" />
                  {t.plansSettings.includedFeatures}
                </h3>
              </div>
              <div className="p-4">
                {planFeatures ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(planFeatures).map(([key, value]) => (
                      <div
                        key={key}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-[10px] font-bold transition-colors ${
                          value
                            ? "border border-neutral-100 bg-neutral-50/80 text-neutral-700 dark:border-surface-dark-border-strong dark:bg-neutral-800/50 dark:text-neutral-300"
                            : "bg-transparent text-neutral-400 opacity-60"
                        }`}
                      >
                        <span>{featureLabels[key] ?? key}</span>
                        {value ? <span className="text-emerald-500">{t.plansSettings.active}</span> : <span>—</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-neutral-400">{t.plansSettings.noFeaturesListed}</p>
                )}
              </div>
            </div>

            {isHistoryVisible ? (
              <UsageHistoryTable
                items={historyItems}
                isLoading={historyLoading}
                errorMessage={historyError}
                hasMore={historyHasMore}
                isLoadingMore={historyLoadingMore}
                onRetry={() => {
                  void loadHistory(false);
                }}
                onLoadMore={() => {
                  void loadHistory(true);
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </SettingsPageShell>
  );
}
