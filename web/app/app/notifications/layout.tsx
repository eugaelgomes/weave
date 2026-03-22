"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Archive, Inbox, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationHeader } from "@/app/app/_components/ui/headers/notification-header";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

function NotificationSidebar({ className, onLinkClick }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className={cn("flex flex-col bg-white dark:bg-neutral-950", className)}>
      <div className="flex h-8 items-center justify-between border-b border-neutral-100 px-2 dark:border-neutral-900">
        <div className="flex items-center gap-1 text-[10px] font-semibold tracking-widest text-neutral-700 dark:text-neutral-200">
          <Bell className="h-3 w-3 text-yellow-500" />
          Notifications
        </div>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="text-neutral-400 hover:text-neutral-900 lg:hidden dark:text-neutral-500 dark:hover:text-neutral-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-widest text-neutral-400 uppercase">
            Filters
          </div>
          <div className="space-y-0.5">
            <Link
              href="/app/notifications"
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100",
                pathname === "/app/notifications" &&
                  "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
              )}
            >
              <Inbox className="h-3.5 w-3.5" />
              Inbox
            </Link>
            <Link
              href="/app/notifications?filter=archived"
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100",
                pathname?.includes("archived") &&
                  "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
              )}
            >
              <Archive className="h-3.5 w-3.5" />
              Archived
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <NotificationHeader
        className="shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        titleSuffix={
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="ml-2 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 active:bg-neutral-200 lg:hidden dark:hover:bg-neutral-900 dark:active:bg-neutral-800"
          >
            <Menu className="h-4 w-4" />
          </button>
        }
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <NotificationSidebar
          className={cn(
            "absolute inset-y-0 left-0 z-50 w-64 border-r border-neutral-200 shadow-lg transition-transform duration-300 lg:static lg:block lg:shadow-none dark:border-neutral-800",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          onLinkClick={() => setIsSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-4 dark:bg-neutral-950/50">
          <div className="mx-auto max-w-5xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
