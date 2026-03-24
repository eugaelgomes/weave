"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar as CalendarIcon,
  X,
  RefreshCw,
  Clock,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { FaProjectDiagram } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useAuth } from "@/app/_contexts/auth-context";
import type { UserPreferences } from "@/types/user-preferences";
import {
  fetchGoogleCalendarEvents,
  connectGoogleCalendar,
  type GoogleCalendarEvent,
} from "@/app/_services/calendar-service/calendar-service";

import { calendarUtils } from "@/app/_utils/calendar";
// ─── Interfaces e Tipos ──
export interface CalendarPreviewProps {
  className?: string;
}

type ViewType = "day" | "week" | "month" | "semester" | "year";

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

// ─── Day View Grid Constants ─────────────────────────────────────────────────
const HOUR_HEIGHT = 60;
const TOTAL_GRID_HEIGHT = 24 * HOUR_HEIGHT;

const getMinutesFromMidnight = (dateString: string): number => {
  const date = new Date(dateString);
  return date.getHours() * 60 + date.getMinutes();
};

const getEventDurationMinutes = (start: string, end: string | null): number => {
  if (!end) return 60;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  return Math.max(diff, 15);
};

const minutesToPixels = (minutes: number): number => {
  return (minutes / (24 * 60)) * TOTAL_GRID_HEIGHT;
};

interface PositionedEvent {
  event: { time: string; type: "note" | "project" | "calendar"; data: any };
  startMin: number;
  endMin: number;
  column: number;
  totalColumns: number;
}

const layoutOverlappingEvents = (
  events: Array<{ time: string; type: "note" | "project" | "calendar"; data: any }>
): PositionedEvent[] => {
  const entries: PositionedEvent[] = events
    .filter((e) => !e.data.allDay)
    .map((event) => {
      const startMin = getMinutesFromMidnight(event.time);
      const endTime = event.type === "calendar" ? event.data.end : null;
      const duration = getEventDurationMinutes(event.time, endTime);
      return {
        event,
        startMin,
        endMin: startMin + duration,
        column: 0,
        totalColumns: 1,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const groups: PositionedEvent[][] = [];
  let currentGroup: PositionedEvent[] = [];
  let groupEnd = 0;

  for (const entry of entries) {
    if (currentGroup.length > 0 && entry.startMin >= groupEnd) {
      groups.push(currentGroup);
      currentGroup = [];
      groupEnd = 0;
    }
    let col = 0;
    const usedCols = new Set(
      currentGroup.filter((e) => e.endMin > entry.startMin).map((e) => e.column)
    );
    while (usedCols.has(col)) col++;
    entry.column = col;
    currentGroup.push(entry);
    groupEnd = Math.max(groupEnd, entry.endMin);
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  for (const group of groups) {
    const maxCol = Math.max(...group.map((e) => e.column)) + 1;
    group.forEach((e) => (e.totalColumns = maxCol));
  }

  return entries;
};

const getMonthNames = (locale: string = "pt-BR") => {
  return locale.startsWith("en") ? calendarUtils.months.en : calendarUtils.months.pt;
};

const getWeekDays = (locale: string = "pt-BR") => {
  return locale.startsWith("en") ? calendarUtils.weekDays.en : calendarUtils.weekDays.pt;
};

const formatTime = (
  dateString: string,
  timeFormat: "12h" | "24h" = "24h",
  locale: string = "pt-BR"
) => {
  const date = new Date(dateString);

  if (timeFormat === "12h") {
    return date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatTimeRange = (
  startStr: string,
  endStr: string | null,
  allDay: boolean,
  timeFormat: "12h" | "24h" = "24h",
  locale: string = "pt-BR"
): string => {
  const isPtBr = locale.startsWith("pt");
  if (allDay) return isPtBr ? "Dia inteiro" : "All day";
  const startFormatted = formatTime(startStr, timeFormat, locale);
  if (!endStr) return startFormatted;
  const endFormatted = formatTime(endStr, timeFormat, locale);
  return `${startFormatted} - ${endFormatted}`;
};

export function CalendarPreview({ className = "h-full min-h-[500px]" }: CalendarPreviewProps) {
  const { notes } = useNotes();
  const { projects } = useProjects();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEvent[]>([]);
  const [gcalConnected, setGcalConnected] = useState(false);
  // Track the year/half-year window currently fetched
  const [fetchedWindow, setFetchedWindow] = useState<string | null>(null);

  const userPreferences = useMemo(() => {
    return (user?.usage_preference as UserPreferences) || {};
  }, [user]);

  const locale = userPreferences.language?.interface || "pt-BR";
  const timeFormat = userPreferences.language?.timeFormat || "24h";

  const MONTH_NAMES = useMemo(() => getMonthNames(locale), [locale]);
  const WEEK_DAYS = useMemo(() => getWeekDays(locale), [locale]);

  // Textos localizados
  const texts = useMemo(() => {
    const isPtBr = locale.startsWith("pt");
    return {
      today: isPtBr ? "Hoje" : "Today",
      day: isPtBr ? "Dia" : "Day",
      week: isPtBr ? "Semana" : "Week",
      month: isPtBr ? "Mês" : "Month",
      semester: isPtBr ? "Semestre" : "Semester",
      year: isPtBr ? "Ano" : "Year",
      firstSemester: isPtBr ? "1º Semestre" : "1st Semester",
      secondSemester: isPtBr ? "2º Semestre" : "2nd Semester",
      noEvents: isPtBr
        ? "Nenhum evento programado para este dia."
        : "No events scheduled for this day.",
      updatedAt: isPtBr ? "Atualizado às" : "Updated at",
      updatedAtFull: isPtBr ? "Atualizada às" : "Updated at",
      records: isPtBr ? "Registros" : "Records",
      noActivities: isPtBr ? "Sem atividades" : "No activities",
      allDay: isPtBr ? "Dia inteiro" : "All day",
      openInGCal: isPtBr ? "Abrir no Google Calendar" : "Open in Google Calendar",
    };
  }, [locale]);

  // ─── Navegação Baseada na View Atual ──────────────────────────────────────
  const navigate = useCallback(
    (direction: 1 | -1) => {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        if (view === "day") d.setDate(d.getDate() + direction);
        if (view === "week") d.setDate(d.getDate() + direction * 7);
        if (view === "month") d.setMonth(d.getMonth() + direction);
        if (view === "semester") d.setMonth(d.getMonth() + direction * 6);
        if (view === "year") d.setFullYear(d.getFullYear() + direction);
        return d;
      });
    },
    [view]
  );

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  // Navegação do dia selecionado
  const navigateSelectedDay = useCallback(
    (direction: 1 | -1) => {
      if (!selectedDate) return;
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + direction);
      setSelectedDate(newDate);
    },
    [selectedDate]
  );

  const closeSelectedDay = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // ─── Google Calendar Events Fetch ────────────────────────────────────────
  useEffect(() => {
    const year = currentDate.getFullYear();
    const windowKey = `${year}`;
    if (fetchedWindow === windowKey) return;

    const timeMin = new Date(year - 1, 11, 1).toISOString();
    const timeMax = new Date(year + 1, 11, 31, 23, 59, 59).toISOString();

    fetchGoogleCalendarEvents(timeMin, timeMax)
      .then((res) => {
        setGcalConnected(res.connected);
        if (res.connected) {
          setGcalEvents(res.events);
          setFetchedWindow(windowKey);
        }
      })
      .catch(() => {
        /* silently ignore if not connected */
      });
  }, [currentDate, fetchedWindow]);

  // ─── Estrutura de Eventos O(1) Lookup ────────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<
      string,
      { notes: any[]; projects: any[]; calendarEvents: GoogleCalendarEvent[] }
    >();

    const ensureKey = (dateKey: string) => {
      if (!map.has(dateKey)) map.set(dateKey, { notes: [], projects: [], calendarEvents: [] });
    };

    const addToMap = (dateString: string, item: any, type: "note" | "project") => {
      if (!dateString) return;
      const d = new Date(dateString);
      const dateKey = toDateKey(d);
      ensureKey(dateKey);
      if (type === "note") map.get(dateKey)!.notes.push(item);
      if (type === "project") map.get(dateKey)!.projects.push(item);
    };

    notes?.forEach((note) => addToMap(note.updated_at || note.created_at, note, "note"));
    projects?.forEach((project) =>
      addToMap(project.updated_at || project.created_at, project, "project")
    );

    gcalEvents.forEach((event) => {
      if (!event.start) return;
      // Eventos allDay têm start no formato "YYYY-MM-DD" (sem horário).
      // new Date("YYYY-MM-DD") interpreta como UTC, causando off-by-one em UTC-3.
      // Fazer parse local para evitar o bug de fuso.
      let d: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(event.start)) {
        const [y, m, day] = event.start.split("-").map(Number);
        d = new Date(y, m - 1, day);
      } else {
        d = new Date(event.start);
      }
      const dateKey = toDateKey(d);
      ensureKey(dateKey);
      map.get(dateKey)!.calendarEvents.push(event);
    });

    return map;
  }, [notes, projects, gcalEvents]);

  const headerTitle = useMemo(() => {
    const year = currentDate.getFullYear();
    const monthName = MONTH_NAMES[currentDate.getMonth()];
    const isPtBr = locale.startsWith("pt");

    if (view === "day") {
      return isPtBr
        ? `${currentDate.getDate()} de ${monthName} de ${year}`
        : `${monthName} ${currentDate.getDate()}, ${year}`;
    }

    if (view === "week") {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)} ${year}`;
    }

    if (view === "month") return `${monthName} ${year}`;

    if (view === "semester") {
      const sem = currentDate.getMonth() < 6 ? texts.firstSemester : texts.secondSemester;
      return `${sem} ${year}`;
    }

    return `${texts.year} ${year}`;
  }, [currentDate, view, MONTH_NAMES, locale, texts]);

  const EventChip = ({ event, type }: { event: any; type: "note" | "project" }) => {
    const isNote = type === "note";
    const title = isNote ? event.title : event.name;
    const time = formatTime(event.updated_at || event.created_at, timeFormat, locale);

    return (
      <div
        className={`flex items-center gap-1.5 truncate rounded px-1.5 py-1 text-[9px] font-medium transition-colors sm:text-[10px] ${
          isNote
            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:hover:bg-yellow-500/20"
            : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
        }`}
      >
        {isNote ? (
          <FileText size={10} className="hidden shrink-0 sm:block" />
        ) : (
          <FaProjectDiagram size={10} className="hidden shrink-0 sm:block" />
        )}
        <span className="flex-1 truncate">{title}</span>
        <span className="hidden shrink-0 text-[8px] opacity-70 sm:block sm:text-[9px]">{time}</span>
      </div>
    );
  };

  const GCalEventChip = ({ event }: { event: GoogleCalendarEvent }) => {
    const time = formatTimeRange(event.start!, event.end, event.allDay, timeFormat, locale);

    return (
      <div className="flex items-center gap-1.5 truncate rounded bg-blue-100 px-1.5 py-1 text-[9px] font-medium text-blue-700 transition-colors hover:bg-blue-200 sm:text-[10px] dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20">
        <FcGoogle size={9} className="hidden shrink-0 sm:block" />
        <span className="flex-1 truncate">{event.title}</span>
        {!event.allDay && (
          <span className="hidden shrink-0 text-[8px] opacity-70 sm:block sm:text-[9px]">
            {time}
          </span>
        )}
      </div>
    );
  };

  // ─── 2. RENDER: MÊS E SEMANA (Grid Expandido) ───
  const renderGrid = (daysToRender: Date[], cols: number) => {
    const today = new Date();
    return (
      <div className="flex flex-1 flex-col gap-1 overflow-hidden border-t border-neutral-200 bg-neutral-100 px-1 dark:border-neutral-800 dark:bg-neutral-800">
        <div className={`grid grid-cols-${cols} rounded-md bg-white dark:bg-neutral-950`}>
          {WEEK_DAYS.slice(0, cols).map((day) => (
            <div
              key={day}
              className="truncate px-1 py-1.5 text-center text-[9px] font-semibold text-neutral-500 sm:text-[10px]"
            >
              <span className="sm:hidden">{day.slice(0, 3)}</span>
              <span className="hidden sm:inline">{day}</span>
            </div>
          ))}
        </div>
        <div className={`grid flex-1 grid-cols-${cols} gap-1 overflow-y-auto`}>
          {daysToRender.map((cellDate, idx) => {
            const dateStr = toDateKey(cellDate);
            const isToday = isSameDay(cellDate, today);
            const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth();
            const dayEvents = eventsByDate.get(dateStr);

            return (
              <div
                key={idx}
                onClick={() => setSelectedDate(cellDate)}
                className={`flex min-h-[70px] cursor-pointer flex-col gap-1 rounded-md bg-white p-1 transition-colors sm:min-h-[100px] sm:p-1.5 dark:bg-neutral-950 ${
                  !isCurrentMonth && view === "month" ? "opacity-50" : ""
                } ${isToday ? "bg-yellow-50/30 dark:bg-yellow-900/5" : "hover:scale-[1.02] hover:bg-neutral-50 hover:shadow-md dark:hover:bg-neutral-900"}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium sm:h-6 sm:w-6 sm:text-[10px] ${
                      isToday
                        ? "bg-yellow-500 text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {cellDate.getDate()}
                  </span>
                </div>
                <div className="custom-scrollbar flex flex-col gap-0.5 overflow-y-auto pr-1 sm:gap-1">
                  {dayEvents?.calendarEvents.map((e, i) => (
                    <GCalEventChip key={`gcal-${i}`} event={e} />
                  ))}
                  {dayEvents?.projects.map((p, i) => (
                    <EventChip key={`p-${i}`} event={p} type="project" />
                  ))}
                  {dayEvents?.notes.map((n, i) => (
                    <EventChip key={`n-${i}`} event={n} type="note" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const days: Date[] = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push(new Date(year, month - 1, prevMonthDays - i));
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push(new Date(year, month + 1, i));

    return renderGrid(days, 7);
  };

  const renderWeek = () => {
    const start = getStartOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return renderGrid(days, 7);
  };

  // ─── 3. RENDER: DAY VIEW (Blocos posicionados estilo Google Calendar) ───
  const renderDay = () => {
    const dateStr = toDateKey(currentDate);
    const dayEvents = eventsByDate.get(dateStr);

    // Combinar todos os eventos do dia
    const allEvents: Array<{ time: string; type: "note" | "project" | "calendar"; data: any }> = [];

    if (dayEvents) {
      dayEvents.calendarEvents.forEach((e) => {
        if (e.start) allEvents.push({ time: e.start, type: "calendar", data: e });
      });
      dayEvents.projects.forEach((p) => {
        allEvents.push({ time: p.updated_at || p.created_at, type: "project", data: p });
      });
      dayEvents.notes.forEach((n) => {
        allEvents.push({ time: n.updated_at || n.created_at, type: "note", data: n });
      });
    }
    allEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Separar eventos all-day de eventos com horário
    const allDayEvents = allEvents.filter((e) => e.data.allDay === true);
    const timedEvents = allEvents.filter((e) => e.data.allDay !== true);

    // Layout de eventos posicionados (com detecção de overlap)
    const positionedEvents = layoutOverlappingEvents(timedEvents);

    // Indicador de hora atual
    const now = new Date();
    const isToday = isSameDay(currentDate, now);
    const currentTimeMin = now.getHours() * 60 + now.getMinutes();

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const colorMap = {
      calendar: {
        bg: "bg-blue-100 dark:bg-blue-900/30",
        border: "border-blue-500",
        hover: "hover:bg-blue-200 dark:hover:bg-blue-900/50",
        text: "text-blue-800 dark:text-blue-200",
        timeText: "text-blue-600 dark:text-blue-400",
      },
      note: {
        bg: "bg-yellow-100 dark:bg-yellow-900/30",
        border: "border-yellow-500",
        hover: "hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
        text: "text-yellow-800 dark:text-yellow-200",
        timeText: "text-yellow-600 dark:text-yellow-400",
      },
      project: {
        bg: "bg-purple-100 dark:bg-purple-900/30",
        border: "border-purple-500",
        hover: "hover:bg-purple-200 dark:hover:bg-purple-900/50",
        text: "text-purple-800 dark:text-purple-200",
        timeText: "text-purple-600 dark:text-purple-400",
      },
    };

    return (
      <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-950">
        {/* Seção de eventos all-day */}
        {allDayEvents.length > 0 && (
          <div className="border-b border-neutral-200 bg-neutral-50 px-2 py-2 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2 pl-14 sm:pl-20">
              <span className="text-[10px] font-medium text-neutral-500 sm:text-xs">
                {texts.allDay}
              </span>
              <div className="flex flex-wrap gap-1">
                {allDayEvents.map((event, idx) => {
                  const colors = colorMap[event.type];
                  const title =
                    event.type === "calendar"
                      ? event.data.title
                      : event.type === "note"
                        ? event.data.title
                        : event.data.name;
                  return (
                    <div
                      key={`allday-${idx}`}
                      className={`cursor-pointer rounded-md border-l-[3px] px-2 py-1 text-[10px] font-medium transition-colors sm:text-xs ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`}
                    >
                      {title}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Grid temporal com eventos posicionados */}
        <div
          className="relative [--label-w:56px] sm:[--label-w:80px]"
          style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
        >
          {/* Linhas de hora e labels */}
          {hours.map((hour) => {
            const isCurrentHour = isToday && hour === now.getHours();
            const hourLabel =
              timeFormat === "12h"
                ? hour === 0
                  ? "12 AM"
                  : hour === 12
                    ? "12 PM"
                    : hour > 12
                      ? `${hour - 12} PM`
                      : `${hour} AM`
                : `${String(hour).padStart(2, "0")}:00`;

            return (
              <div
                key={hour}
                className={`absolute right-0 left-0 border-b border-neutral-200 dark:border-neutral-800 ${
                  isCurrentHour ? "bg-yellow-50/30 dark:bg-yellow-900/5" : ""
                }`}
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <div className="w-[var(--label-w)] shrink-0 px-2 py-2 text-right sm:px-3">
                  <span
                    className={`text-[10px] font-medium sm:text-xs ${
                      isCurrentHour
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {hourLabel}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Blocos de eventos posicionados */}
          {positionedEvents.map((pe, idx) => {
            const { event, startMin, endMin, column, totalColumns } = pe;
            const top = minutesToPixels(startMin);
            const height = Math.max(minutesToPixels(endMin - startMin), 20);
            const colors = colorMap[event.type];
            const title =
              event.type === "calendar"
                ? event.data.title
                : event.type === "note"
                  ? event.data.title
                  : event.data.name;

            const endStr = event.type === "calendar" ? event.data.end : null;
            const timeRangeStr = formatTimeRange(event.time, endStr, false, timeFormat, locale);

            return (
              <div
                key={`positioned-${idx}`}
                className={`absolute cursor-pointer overflow-hidden rounded-md border-l-4 px-2 py-1 transition-all hover:z-20 hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover}`}
                style={{
                  top: `${top}px`,
                  height: `${height}px`,
                  left: `calc(var(--label-w) + (100% - var(--label-w) - 8px) / ${totalColumns} * ${column})`,
                  width: `calc((100% - var(--label-w) - 8px) / ${totalColumns})`,
                  zIndex: 10,
                }}
              >
                <div className="flex h-full flex-col overflow-hidden">
                  <h4 className={`truncate text-[11px] font-semibold ${colors.text}`}>{title}</h4>
                  {height > 30 && (
                    <span className={`text-[10px] ${colors.timeText}`}>{timeRangeStr}</span>
                  )}
                  {height > 55 && event.data.location && (
                    <span className="mt-0.5 truncate text-[9px] text-neutral-500 dark:text-neutral-400">
                      {event.data.location}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Indicador de hora atual (linha vermelha) */}
          {isToday && (
            <div
              className="absolute right-0 z-30 border-t-2 border-red-500"
              style={{
                top: `${minutesToPixels(currentTimeMin)}px`,
                left: "var(--label-w)",
              }}
            >
              <div className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-red-500" />
            </div>
          )}
        </div>

        {/* Mensagem se não houver eventos */}
        {allEvents.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
            <CalendarIcon size={48} className="mb-3 opacity-20" />
            <p className="text-xs">{texts.noEvents}</p>
          </div>
        )}
      </div>
    );
  };

  // ─── 4. RENDER: SEMESTRE / ANO (Heatmap Overview) ───
  const renderMacroView = (monthsCount: number) => {
    const startMonth = view === "semester" ? (currentDate.getMonth() < 6 ? 0 : 6) : 0;
    const year = currentDate.getFullYear();
    const months = Array.from({ length: monthsCount }).map((_, i) => startMonth + i);

    return (
      <div
        className={`grid flex-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 ${
          monthsCount === 6
            ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        {months.map((month) => {
          let monthEventsCount = 0;
          const daysInM = getDaysInMonth(year, month);
          for (let d = 1; d <= daysInM; d++) {
            const events = eventsByDate.get(toDateKey(new Date(year, month, d)));
            if (events)
              monthEventsCount +=
                events.notes.length + events.projects.length + events.calendarEvents.length;
          }

          return (
            <button
              key={month}
              onClick={() => {
                setCurrentDate(new Date(year, month, 1));
                setView("month");
              }}
              className="group flex flex-col items-center justify-center bg-white p-2 hover:bg-neutral-50 sm:p-2 dark:bg-neutral-950 dark:hover:bg-neutral-900"
            >
              <h4 className="text-xs font-semibold text-neutral-700 group-hover:text-yellow-500 sm:text-sm dark:text-neutral-300">
                {MONTH_NAMES[month]}
              </h4>
              <div className="mt-2 flex h-8 w-full items-end justify-center gap-1 opacity-60">
                {monthEventsCount === 0 ? (
                  <span className="text-[10px] text-neutral-400">{texts.noActivities}</span>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-neutral-800 sm:text-base dark:text-neutral-200">
                      {monthEventsCount}
                    </span>
                    <span className="text-[8px] text-neutral-500 uppercase sm:text-[9px]">
                      {texts.records}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ─── 5. RENDER: PAINEL LATERAL DE DETALHES (Estilo Google Calendar) ───
  const renderSidePanel = () => {
    if (!selectedDate) return null;

    const dateStr = toDateKey(selectedDate);
    const dayEvents = eventsByDate.get(dateStr);
    const isPtBr = locale.startsWith("pt");

    const allEvents: Array<{ time: string; type: "note" | "project" | "calendar"; data: any }> = [];

    if (dayEvents) {
      dayEvents.calendarEvents.forEach((e) => {
        if (e.start) allEvents.push({ time: e.start, type: "calendar", data: e });
      });
      dayEvents.projects.forEach((p) => {
        allEvents.push({
          time: p.updated_at || p.created_at,
          type: "project",
          data: p,
        });
      });
      dayEvents.notes.forEach((n) => {
        allEvents.push({
          time: n.updated_at || n.created_at,
          type: "note",
          data: n,
        });
      });
    }

    // Ordenação cronológica ascendente
    allEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const hasEvents = allEvents.length > 0;
    const dayName = WEEK_DAYS[selectedDate.getDay()];
    const monthName = MONTH_NAMES[selectedDate.getMonth()];
    const dayTitle = isPtBr
      ? `${dayName}, ${selectedDate.getDate()} de ${monthName}`
      : `${dayName}, ${monthName} ${selectedDate.getDate()}`;

    const typeLabels = {
      calendar: {
        label: "Google Calendar",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
      note: {
        label: isPtBr ? "Nota" : "Note",
        badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      },
      project: {
        label: isPtBr ? "Projeto" : "Project",
        badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      },
    };

    const borderColors = {
      calendar: "border-l-blue-500",
      note: "border-l-yellow-500",
      project: "border-l-purple-500",
    };

    return (
      <>
        {/* Backdrop mobile */}
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={closeSelectedDay}
        />

        {/* Painel lateral */}
        <div className="animate-in slide-in-from-right fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-[400px] flex-col border-l border-neutral-200 bg-white shadow-xl duration-200 md:relative md:inset-auto md:z-auto md:w-[350px] md:max-w-none md:shadow-none lg:w-[400px] dark:border-neutral-800 dark:bg-neutral-950">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-2 py-2 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateSelectedDay(-1)}
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => navigateSelectedDay(1)}
                className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              onClick={closeSelectedDay}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Título do dia */}
          <div className="border-b border-neutral-200 px-2 py-2 dark:border-neutral-800">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{dayTitle}</h3>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {selectedDate.getFullYear()} &middot;{" "}
              {hasEvents
                ? `${allEvents.length} ${isPtBr ? "eventos" : "events"}`
                : isPtBr
                  ? "Sem eventos"
                  : "No events"}
            </p>
          </div>

          {/* Lista de eventos */}
          <div className="flex-1 overflow-y-auto p-2">
            {!hasEvents ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <CalendarIcon size={36} className="mb-3 opacity-20" />
                <p className="text-xs sm:text-sm">{texts.noEvents}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allEvents.map((event, idx) => {
                  const isCalendar = event.type === "calendar";
                  const isNote = event.type === "note";
                  const item = event.data;
                  const title = isCalendar ? item.title : isNote ? item.title : item.name;

                  const endStr = isCalendar ? item.end : null;
                  const timeRange = formatTimeRange(
                    event.time,
                    endStr,
                    !!item.allDay,
                    timeFormat,
                    locale
                  );

                  const typeInfo = typeLabels[event.type];
                  const borderColor = borderColors[event.type];

                  return (
                    <div
                      key={`${event.type}-${idx}`}
                      className={`rounded-lg border border-l-4 border-neutral-200 ${borderColor} bg-white p-2 transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900`}
                    >
                      {/* Badge de tipo */}
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeInfo.badge}`}
                        >
                          {isCalendar ? (
                            <FcGoogle size={10} />
                          ) : isNote ? (
                            <FileText size={10} />
                          ) : (
                            <FaProjectDiagram size={10} />
                          )}
                          {typeInfo.label}
                        </span>
                      </div>

                      {/* Título */}
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {title}
                      </h4>

                      {/* Horário */}
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <Clock size={14} className="shrink-0 text-neutral-400" />
                        <span>{timeRange}</span>
                      </div>

                      {/* Localização */}
                      {item.location && (
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                          <MapPin size={14} className="shrink-0 text-neutral-400" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      )}

                      {/* Descrição */}
                      {(item.description || item.content) && (
                        <p className="mt-2 rounded-md bg-neutral-50 p-2 text-[11px] leading-relaxed text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                          {(item.description || item.content || "").substring(0, 300)}
                        </p>
                      )}

                      {/* Link do Google Calendar */}
                      {item.htmlLink && (
                        <a
                          href={item.htmlLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                        >
                          <ExternalLink size={12} />
                          {texts.openInGCal}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div
      className={`flex overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}
    >
      {/* Área principal do calendário */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ═══════════ HEADER & CONTROLS ═══════════ */}
        <div className="flex flex-col gap-2 border-b border-neutral-200 bg-white px-2 py-1 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            {/* Navegação de Datas */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={goToToday}
                className="rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 sm:text-[11px] dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                {texts.today}
              </button>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 sm:p-1.5 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="min-w-[120px] text-center text-[11px] font-bold text-neutral-800 sm:min-w-[140px] sm:text-xs dark:text-neutral-100">
                  {headerTitle}
                </span>
                <button
                  onClick={() => navigate(1)}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 sm:p-1.5 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Seletor de Views (Scrollável horizontalmente no mobile) */}
            <div className="flex items-center gap-1.5">
              {gcalConnected ? (
                <button
                  onClick={() => {
                    setFetchedWindow(null);
                  }}
                  className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700 sm:text-[10px] dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                  title={locale.startsWith("pt") ? "Atualizar eventos" : "Refresh events"}
                >
                  <RefreshCw size={12} />
                </button>
              ) : (
                <button
                  onClick={connectGoogleCalendar}
                  className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-100 sm:text-[10px] dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                >
                  <FcGoogle size={10} />
                  <span>{locale.startsWith("pt") ? "Sincronizar Agenda" : "Sync Calendar"}</span>
                </button>
              )}
              <div className="hide-scrollbar w-full overflow-x-auto pb-1 md:w-auto md:pb-0">
                <div className="flex w-max rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-900">
                  {(["day", "week", "month", "semester", "year"] as ViewType[]).map((v) => {
                    const viewLabels: Record<ViewType, string> = {
                      day: texts.day,
                      week: texts.week,
                      month: texts.month,
                      semester: texts.semester,
                      year: texts.year,
                    };

                    return (
                      <button
                        key={v}
                        onClick={() => setView(v)}
                        className={`rounded-md px-2 py-1 text-[10px] font-medium transition-all sm:text-[10px] ${
                          view === v
                            ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                        }`}
                      >
                        {viewLabels[v]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {view === "day" && renderDay()}
        {view === "week" && renderWeek()}
        {view === "month" && renderMonth()}
        {view === "semester" && renderMacroView(6)}
        {view === "year" && renderMacroView(12)}
      </div>

      {/* Painel lateral de detalhes do dia */}
      {selectedDate && renderSidePanel()}
    </div>
  );
}
