import { apiClient, handleResponse, API_ENDPOINTS } from "../api-methods";
import {
  MarkAllReadResponseSchema,
  NotificationEnvelopeSchema,
  NotificationsResponseSchema,
  type NotificationActor,
  type NotificationEntityType,
  type NotificationRow,
  type NotificationStatusFilter,
  type NotificationType,
  type PaginationMeta,
} from "./notifications.schema";

export type {
  NotificationActor,
  NotificationType,
  NotificationEntityType,
  NotificationStatusFilter,
  PaginationMeta,
};

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

const normalizeNotification = (row: NotificationRow): Notification => {
  let content: NotificationContent = {};

  if (typeof row.content === "string") {
    try {
      const parsed: unknown = JSON.parse(row.content);
      content =
        parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? (parsed as NotificationContent)
          : {};
    } catch {
      content = {};
    }
  } else if (row.content && typeof row.content === "object") {
    content = row.content as NotificationContent;
  }

  return {
    ...row,
    content,
  };
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
  const raw = await handleResponse<unknown>(response);
  const data = NotificationsResponseSchema.parse(raw);

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

  const raw = await handleResponse<unknown>(response);
  const data = NotificationEnvelopeSchema.parse(raw);
  return normalizeNotification(data.notification);
};

export const markAllNotificationsRead = async (): Promise<{ updated: number }> => {
  const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS_MARK_ALL_READ);
  const raw = await handleResponse<unknown>(response);
  return MarkAllReadResponseSchema.parse(raw);
};

export const toggleNotificationTrash = async (
  notificationId: string,
  inTrash = true
): Promise<Notification> => {
  const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATION_TOGGLE_TRASH(notificationId), {
    in_trash: inTrash,
  });

  const raw = await handleResponse<unknown>(response);
  const data = NotificationEnvelopeSchema.parse(raw);
  return normalizeNotification(data.notification);
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.NOTIFICATION_BY_ID(notificationId));
  await handleResponse<unknown>(response);
};
