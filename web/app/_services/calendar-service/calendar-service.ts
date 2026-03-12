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
