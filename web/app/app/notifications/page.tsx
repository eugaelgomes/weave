"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Loader2,
  Bell,
  CheckCheck,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { NotificationList } from "./_components/notification-list";
import { useNotification } from "@/app/_contexts/notification-context";

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter") || "all";

  const { notifications, fetchNotifications, loading, error, markAllAsRead } = useNotification();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Mapeamento do parâmetro da URL para o status da API
    let status: "all" | "unread" | "read" | "trash" = "all";
    if (filterParam === "archived") status = "read";
    else if (filterParam === "trash") status = "trash";
    else if (filterParam === "unread") status = "unread";

    setInitialLoading(true);
    fetchNotifications({ status, limit: 50 }).finally(() => setInitialLoading(false));
  }, [filterParam, fetchNotifications]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const getTitle = () => {
    const labels: Record<string, string> = {
      all: "Caixa de Entrada",
      unread: "Não Lidas",
      archived: "Arquivadas",
      trash: "Lixeira",
    };
    return labels[filterParam] || "Caixa de Entrada";
  };

  // --- SKELETON LOADING ---
  if ((initialLoading && notifications.length === 0) || (loading && notifications.length === 0)) {
    return (
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
        <div className="border-b border-neutral-100 px-4 py-4 dark:border-neutral-800/60">
          <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800"></div>
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-start gap-4 p-4">
              <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-900"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800"></div>
                <div className="h-2 w-1/2 rounded bg-neutral-100 dark:bg-neutral-900"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error && notifications.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-red-200 bg-red-50/50 p-6 text-center shadow-sm transition-colors dark:border-red-900/30 dark:bg-red-900/10">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle size={20} className="text-red-500" />
        </div>
        <h3 className="text-[13px] font-bold text-red-900 dark:text-red-400">
          Falha ao carregar notificações
        </h3>
        <p className="mt-1 mb-4 text-[11px] text-red-600/80 dark:text-red-500/80">{error}</p>
        <button
          onClick={() => fetchNotifications({ status: "all", limit: 50 })}
          className="flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-4 py-1.5 text-[11px] font-bold text-red-600 shadow-sm transition-all hover:bg-red-50 active:scale-95 dark:border-red-900/50 dark:bg-neutral-950 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <RefreshCw size={12} />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Container Principal */}
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800/60 dark:bg-neutral-950">
        {/* Cabeçalho */}
        <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800/60">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-amber-500" />
            <h2 className="text-[12px] font-bold tracking-[0.1em] text-neutral-800 uppercase dark:text-neutral-200">
              {getTitle()}
            </h2>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {(!filterParam || filterParam === "all" || filterParam === "unread") &&
              notifications.some((n) => !n.is_read) && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[10px] font-bold text-neutral-600 transition-all hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Marcar todas as listadas como lidas"
                >
                  {loading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  Marcar todas como lidas
                </button>
              )}
          </div>
        </div>

        {/* Lista de Notificações */}
        <div className="relative min-h-[300px] bg-white dark:bg-neutral-950">
          {/* Overlay Loading sutil se estiver atualizando via Tab */}
          {loading && !initialLoading && notifications.length > 0 && (
            <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/50 pt-10 backdrop-blur-[1px] dark:bg-neutral-950/50">
              <Loader2 size={20} className="animate-spin text-amber-500" />
            </div>
          )}

          {notifications.length > 0 ? (
            <NotificationList notifications={notifications} />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                <Bell size={20} className="text-neutral-300 dark:text-neutral-600" />
              </div>
              <h3 className="text-[13px] font-bold text-neutral-900 dark:text-neutral-100">
                Tudo limpo por aqui
              </h3>
              <p className="mt-1 max-w-[200px] text-[11px] leading-relaxed text-neutral-500">
                Você não possui notificações nesta caixa no momento.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
