"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NotificationList } from "./_components/notification-list";
import { useNotification } from "@/app/_contexts/notification-context";
import { NotificationStatusFilter } from "@/app/_services/notifications/notifications-service";

// Re-export NotificationStatusFilter from context to handle it correctly if not exposed

type StatusFilter = "all" | "unread" | "read" | "trash";

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const { notifications, fetchNotifications, loading, error, markAllAsRead } = useNotification();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Determine status based on filter parameter
    let status: any = "all";
    if (filterParam === "archived") {
      status = "read";
    } else if (filterParam === "trash") {
      status = "trash";
    } else if (filterParam === "unread") {
      status = "unread";
    }

    setInitialLoading(true);
    fetchNotifications({ status, limit: 50 }).finally(() => setInitialLoading(false));
  }, [filterParam, fetchNotifications]);

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  }

  // Show global spinner only on first load if we have no notifications
  if ((initialLoading && notifications.length === 0) || (loading && notifications.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error && notifications.length === 0) {
       return (
      <div className="flex h-64 flex-col items-center justify-center text-red-500 rounded-md border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <p className="font-medium text-sm">Failed to load notifications</p>
        <p className="text-xs text-neutral-500 mt-1">{error}</p>
        <button 
            onClick={() => fetchNotifications({ status: 'all', limit: 50 })}
            className="mt-4 px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
            Retry
        </button>
      </div>
    );
  }

  const getTitle = () => {
      switch(filterParam) {
          case "archived": return "Archived";
          case "trash": return "Trash";
          case "unread": return "Unread";
          default: return "Inbox";
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {getTitle()}
        </h2>
        <div className="flex items-center gap-3">
             {(!filterParam || filterParam === 'inbox' || filterParam === 'unread') && notifications.some(n => !n.is_read) && (
            <button 
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 transition-colors"
                title="Mark all listed notifications as read"
            >
                Mark all as read
            </button>
        )}
        </div>
      </div>
      <NotificationList notifications={notifications} />
    </div>
  );
}
