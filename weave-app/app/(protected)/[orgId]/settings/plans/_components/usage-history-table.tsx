"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import type { PlanUsageHistoryItem } from "@/app/_services/plans-service/plan-usage-service";
import { formatDate } from "@/app/_utils/format";
import {
  formatMetricValue,
  formatPercentage,
} from "@/app/(protected)/[orgId]/settings/plans/_utils/usage-format";
import { UsageHistoryRowDetails } from "@/app/(protected)/[orgId]/settings/plans/_components/usage-history-row-details";

type UsageHistoryTableProps = {
  items: PlanUsageHistoryItem[];
  isLoading: boolean;
  errorMessage: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
};

export function UsageHistoryTable({
  items,
  isLoading,
  errorMessage,
  hasMore,
  isLoadingMore,
  onRetry,
  onLoadMore,
}: UsageHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const rowIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  useEffect(() => {
    if (expandedId && !rowIds.has(expandedId)) {
      setExpandedId(null);
    }
  }, [expandedId, rowIds]);

  return (
    <div className="dark:border-surface-dark-border dark:shadow-surface-dark-sm flex flex-col overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm transition-all dark:bg-[#1d1d1b]">
      <div className="dark:border-surface-dark-border-muted flex items-center justify-between border-b border-neutral-100/60 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-neutral-500 dark:text-neutral-400">
          <History size={13} className="text-amber-500" />
          Histórico Mensal
        </h3>
      </div>

      {isLoading ? (
        <div className="p-4 text-[12px] text-neutral-500 dark:text-neutral-400">
          Carregando histórico detalhado...
        </div>
      ) : errorMessage ? (
        <div className="flex items-center justify-between gap-3 p-4">
          <p className="text-[12px] text-red-600 dark:text-red-400">{errorMessage}</p>
          <button
            type="button"
            onClick={onRetry}
            className="dark:border-surface-dark-border rounded-md border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="p-4 text-[12px] text-neutral-500 dark:text-neutral-400">
          Nenhum período histórico encontrado.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-neutral-50 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:bg-[#1d1d1b]/30 dark:text-neutral-400">
                <tr>
                  <th className="px-3 py-2 text-left">Período</th>
                  <th className="px-3 py-2 text-right">Notas</th>
                  <th className="px-3 py-2 text-right">Projetos</th>
                  <th className="px-3 py-2 text-right">IA</th>
                  <th className="px-3 py-2 text-right">Storage</th>
                  <th className="px-3 py-2 text-right">Exports</th>
                  <th className="px-3 py-2 text-right">% Total</th>
                  <th className="px-3 py-2 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="dark:divide-surface-dark-border-muted divide-y divide-neutral-100">
                {items.map((item) => {
                  const open = expandedId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/20">
                        <td className="px-3 py-2 text-left text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                          {formatDate(item.period_start ?? "")} –{" "}
                          {formatDate(item.period_end ?? "")}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          {item.totals.notes_created_period.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          {item.totals.projects_created_period.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          {item.totals.ai_messages_period.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          {formatMetricValue(item.totals.storage_uploaded_mb_period, "MB")}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          {item.totals.exports_period.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          {formatPercentage(item.percentage_total)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedId(open ? null : item.id)}
                            className="dark:border-surface-dark-border inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            {open ? (
                              <>
                                Ocultar <ChevronUp size={11} />
                              </>
                            ) : (
                              <>
                                Abrir <ChevronDown size={11} />
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      {open ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="dark:border-surface-dark-border-muted border-t border-neutral-100 bg-neutral-50/40 p-0 dark:bg-[#1d1d1b]/25"
                          >
                            <UsageHistoryRowDetails item={item} />
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {hasMore ? (
            <div className="dark:border-surface-dark-border-muted border-t border-neutral-100 px-4 py-3">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="dark:border-surface-dark-border rounded-md border border-neutral-200 px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {isLoadingMore ? "Carregando..." : "Carregar mais períodos"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
