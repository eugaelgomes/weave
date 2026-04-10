import { apiClient, API_ENDPOINTS } from "@/app/_services/api-methods";

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  htmlLink: string | null;
  colorId: string | null;
}

export interface CalendarEventsResponse {
  connected: boolean;
  events: GoogleCalendarEvent[];
}

export interface InternalCalendarEvent {
  id: string;
  organization_id: string | null;
  creator_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  note_id: string | null;
  project_id: string | null;
  is_from_note: boolean;
  is_from_project: boolean;
  google_event_id: string | null;
  google_calendar_id: string | null;
  outlook_event_id: string | null;
  outlook_calendar_id: string | null;
  last_synced_at: string | null;
  sync_status: "SYNCED" | "PENDING" | "FAILED" | "OUT_OF_SYNC";
  etag: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  deleted_at: string | null;
}

export interface CreateInternalCalendarEventPayload {
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  create_google_meet?: boolean;
  attendees?: string[];
  organization_id?: string;
  note_id?: string;
  project_id?: string;
  is_from_note?: boolean;
  is_from_project?: boolean;
  sync_with_google?: boolean;
  google_calendar_id?: string;
}

export async function fetchGoogleCalendarStatus(): Promise<{ connected: boolean }> {
  const res = await apiClient.get(API_ENDPOINTS.GOOGLE_CALENDAR_STATUS);
  if (!res.ok) return { connected: false };
  return res.json();
}

export function connectGoogleCalendar() {
  window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/api/v1"}${API_ENDPOINTS.GOOGLE_CALENDAR_AUTH}`;
}

export async function disconnectGoogleCalendar(): Promise<{ success: boolean; message?: string }> {
  const res = await apiClient.delete(API_ENDPOINTS.GOOGLE_CALENDAR_DISCONNECT);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao desconectar Google Calendar");
  }
  return res.json();
}

export async function fetchGoogleCalendarEvents(
  timeMin?: string,
  timeMax?: string
): Promise<CalendarEventsResponse> {
  const params = new URLSearchParams();
  if (timeMin) params.set("timeMin", timeMin);
  if (timeMax) params.set("timeMax", timeMax);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await apiClient.get(`${API_ENDPOINTS.GOOGLE_CALENDAR_EVENTS}${query}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { connected: body.connected ?? false, events: [] };
  }
  return res.json();
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

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao buscar eventos internos");
  }

  const data = (await res.json()) as { events?: InternalCalendarEvent[] };
  return data.events || [];
}

export async function createInternalCalendarEvent(
  payload: CreateInternalCalendarEventPayload
): Promise<InternalCalendarEvent> {
  const res = await apiClient.post(API_ENDPOINTS.CALENDAR_EVENTS, payload);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao criar evento");
  }

  const data = (await res.json()) as { event: InternalCalendarEvent };
  return data.event;
}

export async function updateInternalCalendarEvent(
  eventId: string,
  payload: Partial<CreateInternalCalendarEventPayload>
): Promise<InternalCalendarEvent> {
  const res = await apiClient.patch(API_ENDPOINTS.CALENDAR_EVENT_BY_ID(eventId), payload);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao atualizar evento");
  }

  const data = (await res.json()) as { event: InternalCalendarEvent };
  return data.event;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
}

export interface GoogleCalendarSetting {
  id: string;
  value: string;
}

export interface FreeBusyResponse {
  [calendarId: string]: {
    busy: { start: string; end: string }[];
  }
}

export interface InternalCalendarEventInvite {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string;
  role: "ORGANIZER" | "REQUIRED" | "OPTIONAL" | "RESOURCE";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  external_guest_id: string | null;
  created_at: string;
  updated_at: string;
  deleted: boolean;
  deleted_at: string | null;
}

export interface CreateCalendarEventInvitePayload {
  email: string;
  role?: "ORGANIZER" | "REQUIRED" | "OPTIONAL" | "RESOURCE";
  status?: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
  userId?: string;
  externalGuestId?: string;
}

export interface UpdateCalendarEventInvitePayload {
  role?: "ORGANIZER" | "REQUIRED" | "OPTIONAL" | "RESOURCE";
  status?: "PENDING" | "ACCEPTED" | "DECLINED" | "TENTATIVE";
}

export async function fetchGoogleCalendarSettings(): Promise<{ settings: GoogleCalendarSetting[] }> {
  const res = await apiClient.get(API_ENDPOINTS.GOOGLE_CALENDAR_SETTINGS);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao buscar configurações do Google Calendar");
  }
  return res.json();
}

export async function fetchGoogleCalendarsList(): Promise<{ calendars: GoogleCalendar[] }> {
  const res = await apiClient.get(API_ENDPOINTS.GOOGLE_CALENDAR_LIST);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao buscar calendários do Google");
  }
  return res.json();
}

export async function fetchGoogleFreeBusy(
  timeMin: string,
  timeMax: string,
  items?: { id: string }[]
): Promise<{ freebusy: FreeBusyResponse }> {
  const res = await apiClient.post(API_ENDPOINTS.GOOGLE_CALENDAR_FREEBUSY, {
    timeMin,
    timeMax,
    items
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao verificar disponibilidade (Free/Busy)");
  }
  return res.json();
}

export async function fetchEventInvites(eventId: string): Promise<InternalCalendarEventInvite[]> {
  const res = await apiClient.get(API_ENDPOINTS.CALENDAR_EVENT_INVITES(eventId));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao buscar convites do evento");
  }
  return res.json() as Promise<InternalCalendarEventInvite[]>;
}

export async function createEventInvite(eventId: string, payload: CreateCalendarEventInvitePayload): Promise<InternalCalendarEventInvite> {
  const res = await apiClient.post(API_ENDPOINTS.CALENDAR_EVENT_INVITES(eventId), payload);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao criar convite do evento");
  }
  return res.json() as Promise<InternalCalendarEventInvite>;
}

export async function updateEventInvite(
  eventId: string,
  inviteId: string,
  payload: UpdateCalendarEventInvitePayload
): Promise<InternalCalendarEventInvite> {
  const res = await apiClient.patch(API_ENDPOINTS.CALENDAR_EVENT_INVITE_BY_ID(eventId, inviteId), payload);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao atualizar convite do evento");
  }
  return res.json() as Promise<InternalCalendarEventInvite>;
}

export async function deleteEventInvite(eventId: string, inviteId: string): Promise<void> {
  const res = await apiClient.delete(API_ENDPOINTS.CALENDAR_EVENT_INVITE_BY_ID(eventId, inviteId));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Falha ao deletar convite do evento");
  }
}
