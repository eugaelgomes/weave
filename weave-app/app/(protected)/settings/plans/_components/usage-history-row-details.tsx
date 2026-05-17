"use client";

import type {
  PlanUsageHistoryItem,
  UsageComparison,
} from "@/app/_services/plans-service/plan-usage-service";
import {
  formatLimit,
  formatMetricValue,
  formatPercentage,
  USAGE_METRIC_META,
} from "../_utils/usage-format";

type UsageHistoryRowDetailsProps = {
  item: PlanUsageHistoryItem;
};

function renderComparisonTag(comparison: UsageComparison | undefined) {
  if (!comparison) return "—";
  const signal = comparison.delta === 0 ? "neutral" : comparison.delta > 0 ? "up" : "down";
  const variation =
    comparison.variation_percent === null
      ? "sem base"
      : `${comparison.variation_percent > 0 ? "+" : ""}${comparison.variation_percent.toFixed(1)}%`;

  const className =
    signal === "up"
      ? "text-amber-700 bg-amber-50 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-900/40"
      : signal === "down"
        ? "text-emerald-700 bg-emerald-50 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-900/40"
        : "text-neutral-600 bg-neutral-100 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${className}`}>
      {comparison.delta > 0 ? "+" : ""}
      {comparison.delta} ({variation})
    </span>
  );
}

export function UsageHistoryRowDetails({ item }: UsageHistoryRowDetailsProps) {
  return (
    <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
      {USAGE_METRIC_META.map(({ key, label, unit }) => {
        const metric = item.metrics[key];
        const comparison = item.comparison_vs_previous?.[key];
        return (
          <div
            key={key}
            className="rounded-md border border-neutral-100 bg-neutral-50/70 p-2.5 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/30"
          >
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
              <span>{label}</span>
              {renderComparisonTag(comparison)}
            </div>
            <div className="mt-1 text-[12px] font-bold text-neutral-900 dark:text-neutral-100">
              {formatMetricValue(metric.used, unit)}
            </div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              Limite: {formatLimit(metric.limit, unit)} · {formatPercentage(metric.percentage)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
