"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import {
  connectGoogleCalendar as connectGoogleCalendarService,
  createInternalCalendarEvent,
  updateInternalCalendarEvent,
  disconnectGoogleCalendar as disconnectGoogleCalendarService,
  fetchGoogleCalendarEvents,
  fetchGoogleCalendarStatus,
  fetchInternalCalendarEvents,
  subscribeGoogleCalendarUpdates,
  fetchGoogleCalendarSettings,
  fetchGoogleCalendarsList,
  fetchGoogleFreeBusy,
  type CreateInternalCalendarEventPayload,
  type GoogleCalendarEvent,
  type InternalCalendarEvent,
  type GoogleCalendar,
  type GoogleCalendarSetting,
  type FreeBusyResponse,
} from "@/app/_services/calendar-service/calendar-service";

export type CalendarEventSource = "google" | "internal";
export type UnifiedCalendarEvent = GoogleCalendarEvent & {
  source: CalendarEventSource;
  internalId?: string;
  googleEventId?: string | null;
};

interface CalendarContextType {
  calendarEvents: UnifiedCalendarEvent[];
  googleConnected: boolean;
  loading: boolean;
  creating: boolean;
  error: string | null;
  lastSyncedAt: Date | null;
  loadEventsForYear: (year: number) => Promise<void>;
  refreshEventsForYear: (year: number) => Promise<void>;
  refreshGoogleStatus: () => Promise<void>;
  connectGoogleCalendar: () => void;
  disconnectGoogleCalendar: () => Promise<void>;
  createEvent: (payload: CreateInternalCalendarEventPayload) => Promise<InternalCalendarEvent>;
  updateEvent: (eventId: string, payload: Partial<CreateInternalCalendarEventPayload>) => Promise<InternalCalendarEvent>;
  getGoogleCalendarSettings: () => Promise<GoogleCalendarSetting[]>;
  getGoogleCalendarsList: () => Promise<GoogleCalendar[]>;
  checkGoogleFreeBusy: (timeMin: string, timeMax: string, items?: { id: string }[]) => Promise<FreeBusyResponse>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const mapInternalEvent = (event: InternalCalendarEvent): UnifiedCalendarEvent => ({
  id: event.id,
  internalId: event.id,
  googleEventId: event.google_event_id,
  title: event.title,
  description: event.description,
  location: event.location,
  start: event.start_time,
  end: event.end_time,
  allDay: event.is_all_day,
  htmlLink: null,
  colorId: null,
  source: "internal",
});

export function useCalendar(): CalendarContextType {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar deve ser usado dentro de um CalendarProvider");
  }

  return context;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [calendarEvents, setCalendarEvents] = useState<UnifiedCalendarEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const fetchedYearsRef = useRef<Set<string>>(new Set());
  const lastRequestedYearRef = useRef<number | null>(null);

  const refreshGoogleStatus = useCallback(async () => {
    if (!user?.id) {
      setGoogleConnected(false);
      return;
    }

    try {
      const status = await fetchGoogleCalendarStatus();
      setGoogleConnected(status.connected);
    } catch {
      setGoogleConnected(false);
    }
  }, [user?.id]);

  const runLoadEvents = useCallback(
    async (year: number, forceReload: boolean) => {
      if (!user?.id) return;

      const yearKey = String(year);
      if (!forceReload && fetchedYearsRef.current.has(yearKey)) return;

      lastRequestedYearRef.current = year;
      setLoading(true);
      setError(null);

      const timeMin = new Date(year - 1, 11, 1).toISOString();
      const timeMax = new Date(year + 1, 11, 31, 23, 59, 59).toISOString();

      const [googleResult, internalResult] = await Promise.allSettled([
        fetchGoogleCalendarEvents(timeMin, timeMax),
        fetchInternalCalendarEvents(timeMin, timeMax),
      ]);

      const nextEvents: UnifiedCalendarEvent[] = [];
      const googleEventIds = new Set<string>();

      if (googleResult.status === "fulfilled") {
        setGoogleConnected(googleResult.value.connected);
        if (googleResult.value.connected) {
          googleResult.value.events.forEach((event) => {
            googleEventIds.add(event.id);
            nextEvents.push({
              ...event,
              source: "google" as const,
            });
          });
        }
      } else {
        setGoogleConnected(false);
      }

      if (internalResult.status === "fulfilled") {
        internalResult.value.forEach((event) => {
          const mapped = mapInternalEvent(event);
          if (mapped.googleEventId && googleEventIds.has(mapped.googleEventId)) {
            return;
          }
          if (mapped.googleEventId) {
            googleEventIds.add(mapped.googleEventId);
          }
          nextEvents.push(mapped);
        });
      }

      if (googleResult.status === "rejected" && internalResult.status === "rejected") {
        setError("Falha ao carregar eventos do calendário");
      }

      setCalendarEvents(nextEvents);
      setLastSyncedAt(new Date());
      fetchedYearsRef.current.add(yearKey);
      setLoading(false);
    },
    [user?.id]
  );

  const loadEventsForYear = useCallback(
    async (year: number) => {
      await runLoadEvents(year, false);
    },
    [runLoadEvents]
  );

  const refreshEventsForYear = useCallback(
    async (year: number) => {
      fetchedYearsRef.current.delete(String(year));
      await runLoadEvents(year, true);
    },
    [runLoadEvents]
  );

  const createEvent = useCallback(
    async (payload: CreateInternalCalendarEventPayload): Promise<InternalCalendarEvent> => {
      setCreating(true);
      setError(null);

      try {
        const createdEvent = await createInternalCalendarEvent(payload);

        const activeYear =
          lastRequestedYearRef.current ?? new Date(createdEvent.start_time).getFullYear();
        fetchedYearsRef.current.delete(String(activeYear));
        await runLoadEvents(activeYear, true);

        return createdEvent;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Falha ao criar evento";
        setError(message);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [runLoadEvents]
  );

  const updateEvent = useCallback(
    async (eventId: string, payload: Partial<CreateInternalCalendarEventPayload>): Promise<InternalCalendarEvent> => {
      setCreating(true);
      setError(null);

      try {
        const updatedEvent = await updateInternalCalendarEvent(eventId, payload);

        const activeYear =
          lastRequestedYearRef.current ?? new Date(updatedEvent.start_time).getFullYear();
        fetchedYearsRef.current.delete(String(activeYear));
        await runLoadEvents(activeYear, true);

        return updatedEvent;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Falha ao atualizar evento";
        setError(message);
        throw err;
      } finally {
        setCreating(false);
      }
    },
    [runLoadEvents]
  );

  const connectGoogleCalendar = useCallback(() => {
    connectGoogleCalendarService();
  }, []);

  const disconnectGoogleCalendar = useCallback(async () => {
    await disconnectGoogleCalendarService();
    setGoogleConnected(false);
    setCalendarEvents((prev) => prev.filter((event) => event.source !== "google"));
    fetchedYearsRef.current.clear();
  }, []);

  const getGoogleCalendarSettings = useCallback(async () => {
    const { settings } = await fetchGoogleCalendarSettings();
    return settings;
  }, []);

  const getGoogleCalendarsList = useCallback(async () => {
    const { calendars } = await fetchGoogleCalendarsList();
    return calendars;
  }, []);

  const checkGoogleFreeBusy = useCallback(async (timeMin: string, timeMax: string, items?: { id: string }[]) => {
    const { freebusy } = await fetchGoogleFreeBusy(timeMin, timeMax, items);
    return freebusy;
  }, []);

  useEffect(() => {
    if (!googleConnected || !user?.id) return;

    const unsubscribe = subscribeGoogleCalendarUpdates(() => {
      fetchedYearsRef.current.clear();
      const activeYear = lastRequestedYearRef.current;

      if (activeYear) {
        runLoadEvents(activeYear, true).catch(() => {
          setError("Falha ao atualizar eventos do Google Calendar");
        });
      }
    });

    return unsubscribe;
  }, [googleConnected, runLoadEvents, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setCalendarEvents([]);
      setGoogleConnected(false);
      setError(null);
      setLastSyncedAt(null);
      fetchedYearsRef.current.clear();
      lastRequestedYearRef.current = null;
      return;
    }

    refreshGoogleStatus().catch(() => {
      setGoogleConnected(false);
    });
  }, [refreshGoogleStatus, user?.id]);

  return (
    <CalendarContext.Provider
      value={{
        calendarEvents,
        googleConnected,
        loading,
        creating,
        error,
        lastSyncedAt,
        loadEventsForYear,
        refreshEventsForYear,
        refreshGoogleStatus,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
        createEvent,
        updateEvent,
        getGoogleCalendarSettings,
        getGoogleCalendarsList,
        checkGoogleFreeBusy,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
}
