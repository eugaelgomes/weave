"use client";

import { Activity, CreditCard, PieChart } from "lucide-react";
import { formatPeriodLabel, formatPercentage } from "../_utils/usage-format";

type CurrentUsageSummaryCardProps = {
  planName?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalPercentage?: number | null;
  historyExpanded: boolean;
  historyLoaded: boolean;
  onToggleHistory: () => void;
};

export function CurrentUsageSummaryCard({
  planName,
  periodStart,
  periodEnd,
  totalPercentage,
  historyExpanded,
  historyLoaded,
  onToggleHistory,
}: CurrentUsageSummaryCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm transition-all dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
      <div className="flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5 dark:border-surface-dark-border-muted">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <CreditCard size={13} className="text-amber-500" />
          Plano Atual
        </h3>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-emerald-600 uppercase ring-1 ring-emerald-500/20 dark:text-emerald-400">
          {planName ?? "Sem plano"}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
              Ciclo Atual
            </span>
            <p className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
              {formatPeriodLabel(periodStart, periodEnd)}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5 dark:border-surface-dark-border-strong/50 dark:bg-neutral-800/50">
            <PieChart size={14} className="text-amber-500" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">
              {formatPercentage(totalPercentage)} da cota utilizada
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleHistory}
          className="group flex items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-700 transition-all hover:bg-amber-100 active:scale-95 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-500 dark:hover:bg-amber-900/20"
        >
          <Activity size={12} className="transition-transform group-hover:scale-110" />
          {historyExpanded
            ? "Ocultar histórico"
            : historyLoaded
              ? "Ver histórico novamente"
              : "Ver histórico"}
        </button>
      </div>
    </div>
  );
}
