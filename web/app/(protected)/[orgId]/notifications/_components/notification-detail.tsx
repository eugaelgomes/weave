"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mail,
  Trash2,
  Check,
  UserPlus,
  FileText,
  Briefcase,
  Bot,
  ArchiveRestore,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Notification,
  NotificationType,
} from "@/app/_services/notifications/notifications-service";
import { useNotification } from "@/app/_contexts/notification-context";

interface NotificationDetailProps {
  notification: Notification;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "system_alert":
      return AlertCircle;
    case "system_update":
      return CheckCircle2;
    case "organization_invite":
    case "project_invite":
      return UserPlus;
    case "note_shared":
      return FileText;
    case "ai_action":
      return Bot;
    case "job_action":
      return Briefcase;
    default:
      return Mail;
  }
};

const getIconColor = (type: NotificationType) => {
  switch (type) {
    case "system_alert":
      return "text-red-500";
    case "system_update":
      return "text-green-500";
    case "organization_invite":
    case "project_invite":
      return "text-blue-500";
    case "note_shared":
      return "text-purple-500";
    case "ai_action":
      return "text-brand-primary-500";
    case "job_action":
      return "text-slate-500";
    default:
      return "text-blue-500";
  }
};

export function NotificationDetail({ notification }: NotificationDetailProps) {
  const router = useRouter();
  const { markAsRead, moveToTrash, restoreFromTrash, deletePermanently } = useNotification();
  const [loadingAction, setLoadingAction] = useState(false);

  // Safely get icon and color
  const Icon = getNotificationIcon(notification.type);
  const iconColor = getIconColor(notification.type);

  const handleMarkAsRead = async () => {
    setLoadingAction(true);
    await markAsRead(notification.id);
    setLoadingAction(false);
  };

  const handleTrash = async () => {
    setLoadingAction(true);
    await moveToTrash(notification.id);
    router.push("/notifications");
  };

  const handleRestore = async () => {
    setLoadingAction(true);
    await restoreFromTrash(notification.id);
    setLoadingAction(false);
  };

  const handleDelete = async () => {
    setLoadingAction(true);
    await deletePermanently(notification.id);
    router.push("/notifications?filter=trash");
  };

  const content = notification.content || {};
  const message = content.message || content.description || content.summary || "No content";
  const actionRequired = content.action;
  const resourceUrl = typeof content.url === "string" ? content.url : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/notifications"
          className="rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {notification.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>{new Date(notification.created_at).toLocaleString()}</span>
            <span>•</span>
            <span className={cn("capitalize")}>{notification.type.replace("_", " ")}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {!notification.is_read && (
            <button
              onClick={handleMarkAsRead}
              disabled={loadingAction}
              className="dark:border-surface-dark-border flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <Check className="h-3.5 w-3.5" />
              Mark as read
            </button>
          )}

          {notification.in_trash ? (
            <>
              <button
                onClick={handleRestore}
                disabled={loadingAction}
                className="dark:border-surface-dark-border flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                <ArchiveRestore className="h-3.5 w-3.5" />
                Restore
              </button>
              <button
                onClick={handleDelete}
                disabled={loadingAction}
                className="flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/30 dark:bg-[#1d1d1b] dark:text-red-400 dark:hover:bg-red-900/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Forever
              </button>
            </>
          ) : (
            <button
              onClick={handleTrash}
              disabled={loadingAction}
              className="dark:border-surface-dark-border flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Trash
            </button>
          )}
        </div>
      </div>

      <div className="dark:border-surface-dark-border rounded-lg border border-neutral-200 bg-white p-6 dark:bg-[#1d1d1b]">
        <div className="flex gap-4">
          <div
            className={cn(
              "mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 p-2 dark:bg-[#1d1d1b]",
              iconColor
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div className="w-full min-w-0 space-y-4 text-sm text-neutral-700 dark:text-neutral-300">
            <div className="prose dark:prose-invert max-w-none">
              <p className="leading-relaxed whitespace-pre-wrap">{String(message)}</p>
              {actionRequired && (
                <div className="dark:border-surface-dark-border mt-4 border-t border-neutral-100 pt-4">
                  <span className="mb-2 block text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                    Action Required
                  </span>
                  <div className="dark:border-surface-dark-border rounded-md border border-neutral-100 bg-neutral-50 p-3 dark:bg-[#1d1d1b]/50">
                    <p>{String(actionRequired)}</p>
                  </div>
                </div>
              )}
              {resourceUrl && (
                <div className="mt-4">
                  <a
                    href={resourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <span className="underline">View Related Resource</span>
                    <ArrowLeft className="h-3 w-3 rotate-180" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
