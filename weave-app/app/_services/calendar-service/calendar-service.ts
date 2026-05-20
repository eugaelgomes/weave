import { apiClient, API_ENDPOINTS, handleResponse } from "@/app/_services/api-methods";
import { z } from "zod";
import {
  GoogleCalendarEventSchema,
  CalendarEventsResponseSchema,
  InternalCalendarEventSchema,
  CreateInternalCalendarEventPayloadSchema,
  GoogleCalendarSchema,
  GoogleCalendarSettingSchema,
  FreeBusyResponseSchema,
  InternalCalendarEventInviteSchema,
  CreateCalendarEventInvitePayloadSchema,
  UpdateCalendarEventInvitePayloadSchema,
  type GoogleCalendarEvent,
  type CalendarEventsResponse,
  type InternalCalendarEvent,
  type CreateInternalCalendarEventPayload,
  type GoogleCalendar,
  type GoogleCalendarSetting,
  type FreeBusyResponse,
  type InternalCalendarEventInvite,
  type CreateCalendarEventInvitePayload,
  type UpdateCalendarEventInvitePayload,
} from "./calendar.schema";

export type {
  GoogleCalendarEvent,
  CalendarEventsResponse,
  InternalCalendarEvent,
  CreateInternalCalendarEventPayload,
  GoogleCalendar,
  GoogleCalendarSetting,
  FreeBusyResponse,
  InternalCalendarEventInvite,
  CreateCalendarEventInvitePayload,
  UpdateCalendarEventInvitePayload,
};

export async function fetchGoogleCalendarStatus(): Promise<{ connected: boolean }> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.GOOGLE_CALENDAR_STATUS);
    const raw = await handleResponse<unknown>(res);
    return z.object({ connected: z.boolean() }).parse(raw);
  } catch {
    return { connected: false };
  }
}

export function connectGoogleCalendar() {
  window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1"}${API_ENDPOINTS.GOOGLE_CALENDAR_AUTH}`;
}

export async function disconnectGoogleCalendar(): Promise<{ success: boolean; message?: string }> {
  const res = await apiClient.delete(API_ENDPOINTS.GOOGLE_CALENDAR_DISCONNECT);
  return await handleResponse<{ success: boolean; message?: string }>(res);
}

export async function fetchGoogleCalendarEvents(
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams();
  if (timeMin) params.set("timeMin", timeMin);
  if (timeMax) params.set("timeMax", timeMax);

  const query = params.toString() ? `?${params.toString()}` : "";
  try {
    const res = await apiClient.get(`${API_ENDPOINTS.GOOGLE_CALENDAR_EVENTS}${query}`);
    const rawData = await handleResponse<unknown>(res);
    return CalendarEventsResponseSchema.parse(rawData);
  } catch (error) {
    return {
      connected: false,
      events: [],
      error: error instanceof Error ? error.message : undefined,
    };
  }
}

export function subscribeGoogleCalendarUpdates(onUpdate: () => void): () => void {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1";
  const streamUrl = `${baseUrl}${API_ENDPOINTS.GOOGLE_CALENDAR_STREAM}`;

  const source = new EventSource(streamUrl, { withCredentials: true });

  source.addEventListener("calendar-update", () => {
    onUpdate();
  });

  source.onerror = () => {
    // Let the native EventSource retry strategy handle reconnects.
  };

  return () => {
    source.close();
  };
}

export async function fetchInternalCalendarEvents(
  from?: string,
  to?: string,
  organizationId?: string
): Promise<InternalCalendarEvent[]> {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (organizationId) params.set("organization_id", organizationId);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiClient.get(`${API_ENDPOINTS.CALENDAR_EVENTS}${query}`);
  const data = await handleResponse<unknown>(res);
  const parsedData = z.object({ events: z.array(InternalCalendarEventSchema).optional() }).parse(data);
  return parsedData.events || [];
}

export async function createInternalCalendarEvent(
  payload: CreateInternalCalendarEventPayload
): Promise<InternalCalendarEvent> {
  const validPayload = CreateInternalCalendarEventPayloadSchema.parse(payload);
  const res = await apiClient.post(API_ENDPOINTS.CALENDAR_EVENTS, validPayload);
  const data = await handleResponse<unknown>(res);
  const parsedData = z.object({ event: InternalCalendarEventSchema }).parse(data);
  return parsedData.event;
}

export async function updateInternalCalendarEvent(
  eventId: string,
  payload: Partial<CreateInternalCalendarEventPayload>
): Promise<InternalCalendarEvent> {
  const validPayload = CreateInternalCalendarEventPayloadSchema.partial().parse(payload);
  const res = await apiClient.patch(API_ENDPOINTS.CALENDAR_EVENT_BY_ID(eventId), validPayload);
  const data = await handleResponse<unknown>(res);
  const parsedData = z.object({ event: InternalCalendarEventSchema }).parse(data);
  return parsedData.event;
}

export async function fetchGoogleCalendarSettings(): Promise<{
  settings: GoogleCalendarSetting[];
}> {
  const res = await apiClient.get(API_ENDPOINTS.GOOGLE_CALENDAR_SETTINGS);
  const data = await handleResponse<unknown>(res);
  return z.object({ settings: z.array(GoogleCalendarSettingSchema) }).parse(data);
}

export async function fetchGoogleCalendarsList(): Promise<{ calendars: GoogleCalendar[] }> {
  const res = await apiClient.get(API_ENDPOINTS.GOOGLE_CALENDAR_LIST);
  const data = await handleResponse<unknown>(res);
  return z.object({ calendars: z.array(GoogleCalendarSchema) }).parse(data);
}

export async function fetchGoogleFreeBusy(
  timeMin: string,
  timeMax: string,
  items?: { id: string }[]
): Promise<{ freebusy: FreeBusyResponse }> {
  const res = await apiClient.post(API_ENDPOINTS.GOOGLE_CALENDAR_FREEBUSY, {
    timeMin,
    timeMax,
    items,
  });
  const data = await handleResponse<unknown>(res);
  return z.object({ freebusy: FreeBusyResponseSchema }).parse(data);
}

export async function fetchEventInvites(eventId: string): Promise<InternalCalendarEventInvite[]> {
  const res = await apiClient.get(API_ENDPOINTS.CALENDAR_EVENT_INVITES(eventId));
  const data = await handleResponse<unknown>(res);
  return z.array(InternalCalendarEventInviteSchema).parse(data);
}

export async function createEventInvite(
  eventId: string,
  payload: CreateCalendarEventInvitePayload
): Promise<InternalCalendarEventInvite> {
  const validPayload = CreateCalendarEventInvitePayloadSchema.parse(payload);
  const res = await apiClient.post(API_ENDPOINTS.CALENDAR_EVENT_INVITES(eventId), validPayload);
  const data = await handleResponse<unknown>(res);
  return InternalCalendarEventInviteSchema.parse(data);
}

export async function updateEventInvite(
  eventId: string,
  inviteId: string,
  payload: UpdateCalendarEventInvitePayload
): Promise<InternalCalendarEventInvite> {
  const validPayload = UpdateCalendarEventInvitePayloadSchema.parse(payload);
  const res = await apiClient.patch(
    API_ENDPOINTS.CALENDAR_EVENT_INVITE_BY_ID(eventId, inviteId),
    validPayload
  );
  const data = await handleResponse<unknown>(res);
  return InternalCalendarEventInviteSchema.parse(data);
}

export async function deleteEventInvite(eventId: string, inviteId: string): Promise<void> {
  const res = await apiClient.delete(API_ENDPOINTS.CALENDAR_EVENT_INVITE_BY_ID(eventId, inviteId));
  await handleResponse<void>(res);
}
