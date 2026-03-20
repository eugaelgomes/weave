"use client";

import React, { useState, useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertCircle,
  MessageSquare,
  Info,
  UserPlus,
  Clock,
  Trash,
} from "lucide-react";
import { NotificationsHeader } from "../_components/ui/headers/notifications-header";
import Pagination from "../_components/ui/notes/pagination";

// =================== TYPES E INTERFACES ===================
type NotificationType = "mention" | "system" | "alert" | "invite";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  sender?: {
    name: string;
    avatar?: string;
  };
}

// =================== MOCK DATA (Substitua por sua API/Contexto) ===================
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "mention",
    title: "Nova menção",
    message: "João Silva mencionou você na nota 'Arquitetura do App'.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 min atrás
    sender: { name: "João Silva" },
  },
  {
    id: "2",
    type: "alert",
    title: "Falha no Backup",
    message: "O backup automático do projeto 'Weave' falhou. Verifique os logs.",
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 horas atrás
  },
  {
    id: "3",
    type: "system",
    title: "Atualização de Sistema",
    message: "A plataforma entrará em manutenção agendada amanhã às 02:00 BRT.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 dia atrás
  },
  {
    id: "4",
    type: "invite",
    title: "Convite para Projeto",
    message: "Maria Souza convidou você para colaborar no projeto 'Marketing Q3'.",
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 dias atrás
    sender: { name: "Maria Souza" },
  },
];

// Utilitário para tempo relativo (ex: "há 5 minutos")
const getRelativeTime = (dateString: string) => {
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const daysDifference = Math.round(
    (new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  if (daysDifference === 0) {
    const hoursDiff = Math.round((new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60));
    if (hoursDiff === 0) {
      const minDiff = Math.round((new Date(dateString).getTime() - Date.now()) / (1000 * 60));
      return rtf.format(minDiff, "minute");
    }
    return rtf.format(hoursDiff, "hour");
  }
  return rtf.format(daysDifference, "day");
};

export default function NotificationsPage() {
  // Estados
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Lógica de Filtro
  const filteredNotifications = useMemo(() => {
    let result = notifications;
    if (filter === "unread") {
      result = result.filter((n) => !n.isRead);
    }
    // Ordenar pelas mais recentes
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Paginação
  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Renderizador de Ícones por tipo
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "mention":
        return <MessageSquare size={16} className="text-blue-500" />;
      case "alert":
        return <AlertCircle size={16} className="text-red-500" />;
      case "invite":
        return <UserPlus size={16} className="text-emerald-500" />;
      case "system":
      default:
        return <Info size={16} className="text-neutral-500" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col space-y-3 bg-neutral-50 dark:bg-neutral-950">
      <NotificationsHeader />

      {/* =================== HEADER / TOOLBAR =================== */}
      <div className="flex flex-col rounded-md border border-neutral-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center gap-4">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-500">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-neutral-950">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          {/* Removed redundant title
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Notificações
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Gerencie seus alertas e mensagens do sistema
            </p>
          </div>
          */}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 sm:mt-0 sm:justify-end">
          {/* Tabs de Filtro */}
          <div className="flex rounded-md bg-neutral-100 p-1 dark:bg-neutral-900">
            <button
              onClick={() => {
                setFilter("all");
                setCurrentPage(1);
              }}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => {
                setFilter("unread");
                setCurrentPage(1);
              }}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === "unread"
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              Não lidas
            </button>
          </div>

          {/* Ações */}
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <CheckCheck size={14} />
            <span className="hidden sm:inline">Marcar todas como lidas</span>
          </button>

          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Trash size={14} />
            <span className="hidden sm:inline">Deletadas</span>
          </button>
        </div>
      </div>

      {/* =================== CONTEÚDO (LISTA) =================== */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        <div className="mx-full space-y-3">
          {paginatedNotifications.length > 0 ? (
            paginatedNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`group flex flex-col gap-3 rounded-lg border p-4 transition-all sm:flex-row sm:items-start sm:gap-4 ${
                  !notification.isRead
                    ? "border-yellow-200 bg-yellow-50/30 dark:border-yellow-900/30 dark:bg-yellow-500/5"
                    : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                }`}
              >
                {/* Ícone indicativo */}
                <div
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border ${
                    !notification.isRead
                      ? "border-white bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-800"
                      : "border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950"
                  }`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Corpo da notificação */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={`truncate text-sm font-semibold ${!notification.isRead ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-700 dark:text-neutral-300"}`}
                    >
                      {notification.title}
                    </h3>
                    <div className="flex flex-shrink-0 items-center gap-1 text-[10px] text-neutral-400">
                      <Clock size={12} />
                      {getRelativeTime(notification.createdAt)}
                    </div>
                  </div>
                  <p
                    className={`mt-1 text-sm leading-relaxed ${!notification.isRead ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-500 dark:text-neutral-500"}`}
                  >
                    {notification.message}
                  </p>
                </div>

                {/* Ações (Aparecem no hover em desktop) */}
                <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      title="Marcar como lida"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Excluir notificação"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            // Empty State
            <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-transparent text-center dark:border-neutral-800">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-neutral-900">
                <Bell size={20} className="text-neutral-400" />
              </div>
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Tudo tranquilo por aqui
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Você não possui notificações no momento.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =================== FOOTER COM A SUA PAGINAÇÃO =================== */}
      {totalPages > 1 && (
        <div className="border-t border-neutral-200 bg-white p-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-950">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            showInfo={true}
            className="mx-auto w-full max-w-4xl"
          />
        </div>
      )}
    </div>
  );
}
