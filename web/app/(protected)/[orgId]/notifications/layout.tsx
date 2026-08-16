"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Archive, Inbox, Menu, X, Trash2, MailWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsHeader } from "@/app/(protected)/_components/ui/headers/notifications-header";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

function NotificationSidebar({ className, onLinkClick }: SidebarProps) {
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get("filter") || "all";

  const filterLinks = [
    { id: "all", label: "Caixa de Entrada", icon: Inbox, href: "/notifications" },
    {
      id: "unread",
      label: "Não Lidas",
      icon: MailWarning,
      href: "/notifications?filter=unread",
    },
    {
      id: "archived",
      label: "Arquivadas",
      icon: Archive,
      href: "/notifications?filter=archived",
    },
    { id: "trash", label: "Lixeira", icon: Trash2, href: "/notifications?filter=trash" },
  ];

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="dark:border-surface-dark-border flex h-12 shrink-0 items-center justify-between border-b border-neutral-100 px-4">
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
      <NotificationsHeader className="dark:border-surface-dark-border border-b border-neutral-200/90 pb-2" />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="dark:border-surface-dark-border flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 md:hidden dark:bg-[#1d1d1b]">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
            Navegação
          </span>
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="dark:border-surface-dark-border-strong flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
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

        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          <NotificationSidebar className="hidden w-full shrink-0 md:flex md:w-[180px] md:flex-col md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:md:border-neutral-800 dark:md:bg-neutral-900/50" />

          {isSidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                aria-label="Fechar menu"
                onClick={() => setIsSidebarOpen(false)}
              />
              <NotificationSidebar
                className="relative z-10 ml-auto flex h-full w-[80%] max-w-xs flex-col bg-white shadow-xl dark:bg-[#1d1d1b]"
                onLinkClick={() => setIsSidebarOpen(false)}
              />
            </div>
          )}

          <div className="dark:shadow-surface-dark-sm flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-neutral-50 md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:bg-[#1d1d1b] dark:md:border-neutral-800">
            <div className="custom-scrollbar mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
