"use client";

import { Database, FileDown, Sparkles, Zap } from "lucide-react";
import type { UsageMetrics } from "@/app/_services/plans-service/plan-usage-service";
import {
  formatLimit,
  formatMetricValue,
  formatPercentage,
  USAGE_METRIC_META,
} from "../_utils/usage-format";

type CurrentUsageBreakdownProps = {
  metrics: UsageMetrics;
};

function progressWidth(percentage: number | null): string {
  if (percentage === null) return "0%";
  return `${Math.min(Math.max(percentage, 0), 100)}%`;
}

export function CurrentUsageBreakdown({ metrics }: CurrentUsageBreakdownProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm transition-all dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
      <div className="flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5 dark:border-surface-dark-border-muted">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <Zap size={13} className="text-amber-500" />
          Consumo Atual Detalhado
        </h3>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {USAGE_METRIC_META.map(({ key, label, unit }) => {
          const item = metrics[key];

          return (
            <article
              key={key}
              className="rounded-md border border-neutral-100 bg-neutral-50/70 p-3 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/30"
            >
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-neutral-500 uppercase">
                <span className="flex items-center gap-1.5">
                  {key.includes("storage") ? (
                    <Database size={11} className="text-amber-500" />
                  ) : key.includes("weave_ai") ? (
                    <Sparkles size={11} className="text-amber-500" />
                  ) : key.includes("exports") || key.includes("backups") ? (
                    <FileDown size={11} className="text-amber-500" />
                  ) : (
                    <Zap size={11} className="text-amber-500" />
                  )}
                  {label}
                </span>
                <span>{formatPercentage(item.percentage)}</span>
              </div>

              <div className="text-[12px] font-bold text-neutral-900 dark:text-neutral-100">
                {formatMetricValue(item.used, unit)}
              </div>
              <p className="mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                Limite: {formatLimit(item.limit, unit)}
              </p>

              {item.limit !== null ? (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/70 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      (item.percentage ?? 0) >= 90 ? "bg-red-500" : "bg-amber-500"
                    }`}
                    style={{ width: progressWidth(item.percentage) }}
                  />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
