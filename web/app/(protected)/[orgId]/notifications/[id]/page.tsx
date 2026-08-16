"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NotificationDetail } from "@/app/(protected)/[orgId]/notifications/_components/notification-detail";
import { Notification } from "@/app/_services/notifications/notifications-service";
import { useNotification } from "@/app/_contexts/notification-context";

export default function NotificationDetailPage() {
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const { notifications, loading, fetchNotifications } = useNotification();
  const [notification, setNotification] = useState<Notification | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    const found = notifications.find((n) => n.id === id);
    if (found) {
      setNotification(found);
    } else if (!loading && notifications.length === 0) {
      fetchNotifications({ limit: 50 });
    }
  }, [id, notifications, loading, fetchNotifications]);

  if (loading && !notification) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!notification && !loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-neutral-500">
        <p>Notification not found in recent list.</p>
        <button
          onClick={() => router.push("/notifications")}
          className="text-sm text-blue-600 hover:underline"
        >
          Return to Notifications
        </button>
      </div>
    );
  }

  if (!notification) return null;

  return <NotificationDetail notification={notification} />;
}
