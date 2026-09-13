"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import {
  Notification,
  FetchNotificationsParams,
  fetchNotifications as apiFetchNotifications,
  markNotificationAsRead as apiMarkNotificationAsRead,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  toggleNotificationTrash as apiToggleNotificationTrash,
  deleteNotification as apiDeleteNotification,
} from "../_services/notifications/notifications-service";
import { useAuth } from "./auth-context";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (params?: FetchNotificationsParams) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (params: FetchNotificationsParams = {}) => {
      if (!user) return;

      setLoading(true);
      setError(null);
      try {
        const data = await apiFetchNotifications(params);
        setNotifications(data.notifications);
        setTotal(data.pagination.total);

        // If we are fetching 'all' or 'unread', we can update unread count estimate
        // Ideally the backend should return the unread count separately
        if (params.status === "unread") {
          setUnreadCount(data.pagination.total);
        } else if (!params.status || params.status === "all") {
          // This is just an approximation if we don't have a dedicated endpoint for count
          const unread = data.notifications.filter((n) => !n.is_read).length;
          setUnreadCount((prev) => (prev > unread ? prev : unread));
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch notifications");
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiMarkNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || "Failed to mark as read");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await apiMarkAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || "Failed to mark all as read");
    }
  }, []);

  const moveToTrash = useCallback(async (id: string) => {
    try {
      await apiToggleNotificationTrash(id, true);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || "Failed to move to trash");
    }
  }, []);

  const restoreFromTrash = useCallback(async (id: string) => {
    try {
      await apiToggleNotificationTrash(id, false);
      // If we are currently viewing trash, we should remove it from the list
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || "Failed to restore notification");
    }
  }, []);

  const deletePermanently = useCallback(async (id: string) => {
    try {
      await apiDeleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || "Failed to delete notification");
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        total,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        moveToTrash,
        restoreFromTrash,
        deletePermanently,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
