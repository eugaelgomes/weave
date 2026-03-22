"use client";

import Link from "next/link";
import { Inbox, Mail, CheckCircle2, AlertCircle, UserPlus, FileText, Briefcase, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Notification, NotificationType } from "@/app/_services/notifications/notifications-service";

interface NotificationListProps {
  notifications: Notification[];
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "system_alert":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "system_update":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "organization_invite":
    case "project_invite":
      return <UserPlus className="h-4 w-4 text-blue-500" />;
    case "note_shared":
      return <FileText className="h-4 w-4 text-purple-500" />;
    case "ai_action":
      return <Bot className="h-4 w-4 text-yellow-500" />;
    case "job_action":
      return <Briefcase className="h-4 w-4 text-slate-500" />;
    default:
      return <Mail className="h-4 w-4 text-blue-500" />;
  }
};

export function NotificationList({ notifications }: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white p-8 text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <Inbox className="h-8 w-8 opacity-50" />
        <p className="text-sm">No notifications found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => {
         const message = typeof notification.content === 'object' 
            ? (notification.content.message || notification.content.description || notification.content.summary || "No content")
            : "No content";

        return (
        <Link
          key={notification.id}
          href={`/app/notifications/${notification.id}`}
          className={cn(
            "group flex items-start gap-3 rounded-md border p-3 transition-all hover:shadow-sm",
            notification.is_read
              ? "border-neutral-200 bg-white text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400"
              : "border-blue-100 bg-blue-50/50 text-neutral-900 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-neutral-100"
          )}
        >
          <div className="mt-0.5 shrink-0">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-xs font-semibold", !notification.is_read && "text-blue-600 dark:text-blue-400")}>
                {notification.title}
              </span>
              <span className="shrink-0 text-[10px] text-neutral-400">
                 {new Date(notification.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="line-clamp-2 text-xs opacity-90">
              {String(message)}
            </p>
          </div>
        </Link>
      )})}
    </div>
  );
}
