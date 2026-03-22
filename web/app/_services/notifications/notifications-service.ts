import { apiClient, handleResponse, API_ENDPOINTS } from "../api-methods";

export type NotificationType =
  | "system_alert"
  | "system_update"
  | "organization_invite"
  | "organization_action"
  | "project_invite"
  | "project_action"
  | "note_shared"
  | "note_action"
  | "ai_action"
  | "job_action";

export type NotificationEntityType = "organization" | "project" | "note" | "job" | "weave-ai";

export type NotificationStatusFilter = "all" | "unread" | "read" | "trash";

export type NotificationContent = Record<string, unknown> & {
  message?: string;
  preview?: string;
  summary?: string;
  action?: string;
  note_title?: string;
  project_title?: string;
  description?: string;
  url?: string;
};

export interface NotificationActor {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string | null;
  actor: NotificationActor | null;
  type: NotificationType;
  entity_type: NotificationEntityType;
  entity_id: string;
  title: string;
  content: NotificationContent;
  is_read: boolean;
  read_at: string | null;
  in_trash: boolean;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: PaginationMeta;
}

export interface FetchNotificationsParams {
  page?: number;
  limit?: number;
  status?: NotificationStatusFilter;
  type?: NotificationType;
  entityType?: NotificationEntityType;
  search?: string;
  order?: "asc" | "desc";
}

const normalizeNotification = (notification: Notification): Notification => {
  if (notification && typeof notification.content === "string") {
    try {
      notification.content = JSON.parse(notification.content);
    } catch {
      notification.content = {} as NotificationContent;
    }
  }

  if (!notification.content || typeof notification.content !== "object") {
    notification.content = {} as NotificationContent;
  }

  return notification;
};

export const fetchNotifications = async (
  params: FetchNotificationsParams = {}
): Promise<NotificationsResponse> => {
  const query = new URLSearchParams();

  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status) query.set("status", params.status);
  if (params.type) query.set("type", params.type);
  if (params.entityType) query.set("entity_type", params.entityType);
  if (params.order) query.set("order", params.order);

  const trimmedSearch = params.search?.trim();
  if (trimmedSearch) {
    query.set("search", trimmedSearch);
  }

  const endpoint = query.toString()
    ? `${API_ENDPOINTS.NOTIFICATIONS}?${query.toString()}`
    : API_ENDPOINTS.NOTIFICATIONS;

  const response = await apiClient.get(endpoint);
  const data = await handleResponse<NotificationsResponse>(response);

  return {
    notifications: data.notifications.map(normalizeNotification),
    pagination: data.pagination,
  };
};

export const markNotificationAsRead = async (
  notificationId: string,
  isRead = true
): Promise<Notification> => {
  const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATION_MARK_READ(notificationId), {
    is_read: isRead,
  });

  const data = await handleResponse<{ notification: Notification }>(response);
  return normalizeNotification(data.notification);
};

export const markAllNotificationsRead = async (): Promise<{ updated: number }> => {
  const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ);
  return handleResponse<{ updated: number }>(response);
};

export const toggleNotificationTrash = async (
  notificationId: string,
  inTrash = true
): Promise<Notification> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.NOTIFICATION_TOGGLE_TRASH(notificationId),
    {
      in_trash: inTrash,
    }
  );

  const data = await handleResponse<{ notification: Notification }>(response);
  return normalizeNotification(data.notification);
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.NOTIFICATION_BY_ID(notificationId));
  await handleResponse<{ success: boolean }>(response);
};
