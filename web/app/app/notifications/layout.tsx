"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Archive, Inbox, Menu, X, Trash2, MailWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationHeader } from "@/app/app/_components/ui/headers/notification-header";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

function NotificationSidebar({ className, onLinkClick }: SidebarProps) {
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter") || "all";

  // Lista centralizada de filtros para facilitar manutenção e padronizar o design
  const filterLinks = [
    { id: "all", label: "Caixa de Entrada", icon: Inbox, href: "/app/notifications" },
    {
      id: "unread",
      label: "Não Lidas",
      icon: MailWarning,
      href: "/app/notifications?filter=unread",
    },
    {
      id: "archived",
      label: "Arquivadas",
      icon: Archive,
      href: "/app/notifications?filter=archived",
    },
    { id: "trash", label: "Lixeira", icon: Trash2, href: "/app/notifications?filter=trash" },
  ];

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Cabeçalho da Sidebar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-100 px-4 dark:border-neutral-800/60">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.1em] text-neutral-800 uppercase dark:text-neutral-200">
          <Bell className="h-3.5 w-3.5 text-amber-500" />
          Notificações
        </div>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            aria-label="Fechar menu"
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 lg:hidden dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Corpo da Sidebar */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-3">
        <div className="mb-4 space-y-2">
          <div className="px-2 text-[10px] font-bold tracking-widest text-neutral-400 uppercase dark:text-neutral-500">
            Filtros
          </div>
          <div className="space-y-0.5">
            {filterLinks.map((link) => {
              const isActive = currentFilter === link.id;
              const Icon = link.icon;

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={onLinkClick}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[11px] font-medium transition-all",
                    isActive
                      ? "bg-amber-50/80 font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-500"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/50 dark:hover:text-neutral-200"
                  )}
                >
                  <Icon size={14} className={isActive ? "text-amber-500" : "opacity-70"} />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-2">
      {/* Header Global */}
      <NotificationHeader className="border-b border-neutral-200/90 pb-2 dark:border-neutral-800" />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Cabeçalho mobile padronizado */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
            Navegação
          </span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            {isSidebarOpen ? (
              <>
                <X className="h-3.5 w-3.5" />
                Fechar menu
              </>
            ) : (
              <>
                <Menu className="h-3.5 w-3.5" />
                Abrir menu
              </>
            )}
          </button>
        </div>

        {/* Layout Flexbox com Gap (Desktop) */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          {/* SIDEBAR LATERAL — Painel flutuante gerido puramente por Flexbox */}
          <NotificationSidebar className="hidden w-full shrink-0 md:flex md:w-[180px] md:flex-col md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:md:border-neutral-800 dark:md:bg-neutral-900/50" />

          {/* Modal Mobile Overlay */}
          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                aria-label="Fechar menu"
                onClick={() => setIsSidebarOpen(false)}
              />
              <NotificationSidebar
                className="relative z-10 ml-auto flex h-full w-[80%] max-w-xs flex-col bg-white shadow-xl dark:bg-neutral-950"
                onLinkClick={() => setIsSidebarOpen(false)}
              />
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL (Notificações Detail) */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-neutral-50 md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:bg-neutral-950 dark:md:border-neutral-800">
            {/* O container interno mantém a largura máxima de 5xl como original */}
            <div className="custom-scrollbar mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
