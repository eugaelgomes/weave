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
    <div className={cn("flex flex-col bg-white dark:bg-neutral-950", className)}>
      {/* Cabeçalho da Sidebar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-100 px-4 dark:border-neutral-800/60">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.1em] text-neutral-800 uppercase dark:text-neutral-200">
          <Bell className="h-3.5 w-3.5 text-amber-500" />
          Notificações
        </div>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
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
    <div className="flex h-full flex-col overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">
      {/* Header Mobile / Global */}
      <NotificationHeader
        className="shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-800/60 dark:bg-neutral-950"
        titleSuffix={
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-2 rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 active:bg-neutral-200 lg:hidden dark:hover:bg-neutral-800 dark:active:bg-neutral-700"
          >
            <Menu className="h-4 w-4" />
          </button>
        }
      />

      <div className="relative mt-2 flex min-h-0 flex-1 overflow-hidden rounded-md shadow shadow-md">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <NotificationSidebar
          className={cn(
            "absolute inset-y-0 left-0 z-50 w-64 border-r border-neutral-200 shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:block lg:shadow-none dark:border-neutral-800/60",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          onLinkClick={() => setIsSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex flex-1 flex-col overflow-y-auto dark:bg-neutral-950/30">
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col">{children}</div>
        </main>
      </div>
    </div>
  );
}
