"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  RefreshCw,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { useAuth } from "@/app/_contexts/auth-context";
import { useCalendar, type UnifiedCalendarEvent } from "@/app/_contexts/calendar-context";
import type { UserPreferences } from "@/types/user-preferences";
import CreateEventModal from "./create-event";

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
  event: TimelineEvent;
  startMin: number;
  endMin: number;
  column: number;
  totalColumns: number;
}

type TimelineEvent = { time: string; type: "calendar"; data: UnifiedCalendarEvent };

const layoutOverlappingEvents = (events: TimelineEvent[]): PositionedEvent[] => {
  const entries: PositionedEvent[] = events
    .filter((e) => !e.data.allDay)
    .map((event) => {
      const startMin = getMinutesFromMidnight(event.time);
      const endTime = event.data.end;
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

const formatHourLabel = (hour: number, timeFormat: "12h" | "24h") => {
  if (timeFormat === "12h") {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    if (hour > 12) return `${hour - 12} PM`;
    return `${hour} AM`;
  }

  return `${String(hour).padStart(2, "0")}:00`;
};

// Aqui definimos um max height e valores seguros para não poluir a view
export function CalendarPreview({
  className = "h-[70vh] min-h-[500px] max-h-[800px]",
}: CalendarPreviewProps) {
  const { user } = useAuth();
  const {
    calendarEvents,
    googleConnected,
    loadEventsForYear,
    refreshEventsForYear,
    connectGoogleCalendar,
  } = useCalendar();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("week");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Ref para controlar o scroll do calendário
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const userPreferences = useMemo(() => {
    return (user?.usage_preference as UserPreferences) || {};
  }, [user]);

  const locale = userPreferences.language?.interface || "pt-BR";
  const timeFormat = userPreferences.language?.timeFormat || "24h";

  const MONTH_NAMES = useMemo(() => getMonthNames(locale), [locale]);
  const WEEK_DAYS = useMemo(() => getWeekDays(locale), [locale]);

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

  useEffect(() => {
    loadEventsForYear(currentDate.getFullYear()).catch(() => {
      // Error state is already managed by CalendarContext.
    });
  }, [currentDate, loadEventsForYear]);

  // Efeito responsável por alinhar o scroll no horário atual
  useEffect(() => {
    if ((view === "day" || view === "week") && scrollContainerRef.current) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const targetY = minutesToPixels(minutes);

      setTimeout(() => {
        if (scrollContainerRef.current) {
          const offset = targetY - scrollContainerRef.current.clientHeight / 2;
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, offset),
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [view, currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { calendarEvents: UnifiedCalendarEvent[] }>();

    const ensureKey = (dateKey: string) => {
      if (!map.has(dateKey)) map.set(dateKey, { calendarEvents: [] });
    };

    calendarEvents.forEach((event) => {
      if (!event.start) return;
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
  }, [calendarEvents]);

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

  const CalendarEventChip = ({ event }: { event: UnifiedCalendarEvent }) => {
    const time = formatTimeRange(event.start!, event.end, event.allDay, timeFormat, locale);
    const isGoogle = event.source === "google";

    return (
      <div
        className={`flex items-center gap-1.5 truncate rounded px-1.5 py-1 text-[9px] font-medium transition-colors sm:text-[10px] ${
          isGoogle
            ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
        }`}
      >
        {isGoogle ? (
          <FcGoogle size={9} className="hidden shrink-0 sm:block" />
        ) : (
          <CalendarIcon size={9} className="hidden shrink-0 sm:block" />
        )}
        <span className="flex-1 truncate">{event.title}</span>
        {!event.allDay && (
          <span className="hidden shrink-0 text-[8px] opacity-70 sm:block sm:text-[9px]">
            {time}
          </span>
        )}
      </div>
    );
  };

  const renderGrid = (daysToRender: Date[], cols: number) => {
    const today = new Date();
    const gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

    return (
      <div className="flex flex-1 flex-col gap-1 overflow-hidden border-t border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-800">
        <div
          className="grid rounded-md bg-white dark:bg-neutral-950"
          style={{ gridTemplateColumns }}
        >
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
        <div
          className="grid flex-1 gap-1 overflow-y-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-primary-700/40 hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700 dark:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/60 [&::-webkit-scrollbar-track]:bg-transparent"
          style={{ gridTemplateColumns }}
        >
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
                        ? "bg-brand-primary-700 text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {cellDate.getDate()}
                  </span>
                </div>
                <div className="custom-scrollbar flex flex-col gap-0.5 overflow-y-auto pr-1 sm:gap-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-primary-700/40 hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700 dark:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/60 [&::-webkit-scrollbar-track]:bg-transparent">
                  {dayEvents?.calendarEvents.map((e, i) => (
                    <CalendarEventChip key={`calendar-${i}`} event={e as UnifiedCalendarEvent} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const start = getStartOfWeek(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });

    const today = new Date();
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const weekEvents = days.map((day) => {
      const dayEvents = eventsByDate.get(toDateKey(day));
      const allEvents: TimelineEvent[] = [];

      if (dayEvents) {
        dayEvents.calendarEvents.forEach((e) => {
          if (e.start) allEvents.push({ time: e.start, type: "calendar", data: e });
        });
      }

      allEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      return {
        date: day,
        allDayEvents: allEvents.filter((e) => e.data.allDay === true),
        positionedEvents: layoutOverlappingEvents(allEvents.filter((e) => e.data.allDay !== true)),
      };
    });

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
      <div
        ref={scrollContainerRef}
        className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto border-t border-neutral-200 bg-white [scrollbar-gutter:stable] dark:border-neutral-800 dark:bg-neutral-950 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-primary-700/40 hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700 dark:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/60 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {/* CABEÇALHO DA SEMANA (Diminuído altura e largura) */}
        <div className="sticky top-0 z-20 grid [grid-template-columns:var(--label-w)_repeat(7,minmax(0,1fr))] divide-x divide-neutral-200 border-b border-neutral-200 [--label-w:40px] sm:[--label-w:56px] dark:divide-neutral-800 dark:border-neutral-800">
          <div className="bg-neutral-50 px-1 py-1 text-right text-[10px] font-medium text-neutral-500 dark:bg-neutral-900/50 dark:text-neutral-400">
            {texts.allDay}
          </div>
          {weekEvents.map(({ date, allDayEvents }, dayIndex) => {
            const isToday = isSameDay(date, today);
            const dayName = WEEK_DAYS[date.getDay()];

            return (
              <div
                key={`week-head-${dayIndex}`}
                onClick={() => setSelectedDate(date)}
                className={`cursor-pointer px-1 py-1 text-center transition-colors ${
                  isToday
                    ? "bg-yellow-50/40 dark:bg-yellow-900/10"
                    : "bg-white hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                }`}
              >
                <div className="truncate text-[9px] font-semibold text-neutral-500 sm:text-[10px] dark:text-neutral-400">
                  <span className="sm:hidden">{dayName.slice(0, 3)}</span>
                  <span className="hidden sm:inline">{dayName}</span>
                </div>
                <div className="flex items-center justify-center">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold sm:h-5 sm:w-5 ${
                      isToday
                        ? "bg-brand-primary-700 text-white"
                        : "text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {allDayEvents.slice(0, 2).map((event, idx) => {
                    const colors = colorMap[event.type];
                    const title = event.data.title;

                    return (
                      <div
                        key={`week-allday-${dayIndex}-${idx}`}
                        className={`truncate rounded border-l-[3px] px-1 py-0.5 text-left text-[9px] font-medium ${colors.bg} ${colors.border} ${colors.text}`}
                      >
                        {title}
                      </div>
                    );
                  })}
                  {allDayEvents.length > 2 && (
                    <span className="text-[9px] text-neutral-500 dark:text-neutral-400">
                      +{allDayEvents.length - 2}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CORPO DA SEMANA (Diminuído largura) */}
        <div
          className="relative grid [grid-template-columns:var(--label-w)_repeat(7,minmax(0,1fr))] divide-x divide-neutral-200 [--label-w:40px] sm:[--label-w:56px] dark:divide-neutral-800"
          style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
        >
          {/* ... resto do grid (linhas, marcações, horas) mantém igual ... */}
          <div className="pointer-events-none absolute inset-0 z-0">
            {hours.map((hour) => (
              <div
                key={`week-hour-line-${hour}`}
                className="absolute right-0 left-0 border-b border-neutral-200 dark:border-neutral-800"
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute inset-0 z-[12]"
            style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
          >
            {Array.from({ length: 8 }, (_, idx) => (
              <div
                key={`week-vertical-divider-${idx}`}
                className="absolute top-0 w-px bg-neutral-200 dark:bg-neutral-800"
                style={{
                  height: `${TOTAL_GRID_HEIGHT}px`,
                  left:
                    idx === 0
                      ? "var(--label-w)"
                      : `calc(var(--label-w) + ((100% - var(--label-w)) / 7) * ${idx})`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10">
            {hours.map((hour) => (
              <div
                key={`week-hour-label-${hour}`}
                className="absolute right-0 left-0"
                style={{ top: `${hour * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <div className="px-1 py-1 text-center sm:px-2">
                  <span className="text-[9px] font-medium text-neutral-500 sm:text-[10px] dark:text-neutral-400">
                    {formatHourLabel(hour, timeFormat)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {weekEvents.map(({ date, positionedEvents }, dayIndex) => {
            const isToday = isSameDay(date, today);

            return (
              <div
                key={`week-day-col-${dayIndex}`}
                onClick={() => setSelectedDate(date)}
                className={`relative z-10 transition-colors ${
                  isToday
                    ? "bg-yellow-50/20 dark:bg-yellow-900/5"
                    : "hover:bg-neutral-50/40 dark:hover:bg-neutral-900/20"
                }`}
              >
                {positionedEvents.map((pe, idx) => {
                  const { event, startMin, endMin, column, totalColumns } = pe;
                  const top = minutesToPixels(startMin);
                  const height = Math.max(minutesToPixels(endMin - startMin), 20);
                  const colors = colorMap[event.type];
                  const title = event.data.title;
                  const endStr = event.data.end;
                  const timeRangeStr = formatTimeRange(
                    event.time,
                    endStr,
                    false,
                    timeFormat,
                    locale
                  );

                  return (
                    <div
                      key={`week-positioned-${dayIndex}-${idx}`}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        setSelectedDate(date);
                      }}
                      className={`absolute z-20 cursor-pointer overflow-hidden rounded-md border-l-4 px-1.5 py-1 transition-all hover:z-30 hover:shadow-lg ${colors.bg} ${colors.border} ${colors.hover}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `calc(((100% - 6px) / ${totalColumns}) * ${column} + 3px)`,
                        width: `calc((100% - 6px) / ${totalColumns})`,
                      }}
                    >
                      <div className="flex h-full flex-col overflow-hidden">
                        <h4 className={`truncate text-[10px] font-semibold ${colors.text}`}>
                          {title}
                        </h4>
                        {height > 28 && (
                          <span className={`truncate text-[9px] ${colors.timeText}`}>
                            {timeRangeStr}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isToday && (
                  <div
                    className="absolute right-0 left-0 z-30 border-t-2 border-red-500"
                    style={{ top: `${minutesToPixels(nowMinutes)}px` }}
                  >
                    <div className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-full bg-red-500" />
                  </div>
                )}
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
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInMonth = getDaysInMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(new Date(year, month, -firstDay + i + 1));
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return renderGrid(days, 7);
  };

  const renderDay = () => {
    const dateStr = toDateKey(currentDate);
    const dayEvents = eventsByDate.get(dateStr);
    const allEvents: TimelineEvent[] = [];

    if (dayEvents) {
      dayEvents.calendarEvents.forEach((e) => {
        if (e.start) allEvents.push({ time: e.start, type: "calendar", data: e });
      });
    }

    allEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const allDayEvents = allEvents.filter((e) => e.data.allDay === true);
    const timedEvents = allEvents.filter((e) => e.data.allDay !== true);

    const positionedEvents = layoutOverlappingEvents(timedEvents);
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-neutral-950 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-primary-700/40 hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700 dark:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/60 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        {allDayEvents.length > 0 && (
          <div className="border-b border-neutral-200 bg-neutral-50 px-1 py-1 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2 pl-10 sm:pl-14">
              <span className="text-[10px] font-medium text-neutral-500 sm:text-xs">
                {texts.allDay}
              </span>
              <div className="flex flex-wrap gap-1">
                {allDayEvents.map((event, idx) => {
                  const colors = colorMap[event.type];
                  const title = event.data.title;
                  return (
                    <div
                      key={`allday-${idx}`}
                      className={`cursor-pointer rounded-md border-l-[3px] px-2 py-0.5 text-[10px] font-medium transition-colors sm:text-xs ${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`}
                    >
                      {title}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CORPO DO DIA (Diminuído largura) */}
        <div
          className="relative [--label-w:40px] sm:[--label-w:56px]"
          style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
        >
          <div
            className="relative [--label-w:56px] sm:[--label-w:80px]"
            style={{ height: `${TOTAL_GRID_HEIGHT}px` }}
          >
            {hours.map((hour) => {
              const isCurrentHour = isToday && hour === now.getHours();
              const hourLabel = formatHourLabel(hour, timeFormat);

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

            {positionedEvents.map((pe, idx) => {
              const { event, startMin, endMin, column, totalColumns } = pe;
              const top = minutesToPixels(startMin);
              const height = Math.max(minutesToPixels(endMin - startMin), 20);
              const colors = colorMap[event.type];
              const title = event.data.title;

              const endStr = event.data.end;
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
        </div>

        {allEvents.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
            <CalendarIcon size={48} className="mb-3 opacity-20" />
            <p className="text-xs">{texts.noEvents}</p>
          </div>
        )}
      </div>
    );
  };

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
            if (events) monthEventsCount += events.calendarEvents.length;
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
              <h4 className="text-xs font-semibold text-neutral-700 group-hover:text-brand-primary-700 sm:text-sm dark:text-neutral-300">
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

  const renderSidePanel = () => {
    if (!selectedDate) return null;

    const dateStr = toDateKey(selectedDate);
    const dayEvents = eventsByDate.get(dateStr);
    const isPtBr = locale.startsWith("pt");

    const allEvents: TimelineEvent[] = [];

    if (dayEvents) {
      dayEvents.calendarEvents.forEach((e) => {
        if (e.start) allEvents.push({ time: e.start, type: "calendar", data: e });
      });
    }

    allEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const hasEvents = allEvents.length > 0;
    const dayName = WEEK_DAYS[selectedDate.getDay()];
    const monthName = MONTH_NAMES[selectedDate.getMonth()];
    const dayTitle = isPtBr
      ? `${dayName}, ${selectedDate.getDate()} de ${monthName}`
      : `${dayName}, ${monthName} ${selectedDate.getDate()}`;

    const typeLabels = {
      calendar: {
        label: isPtBr ? "Evento de calendário" : "Calendar event",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      },
    };

    const borderColors = {
      calendar: "border-l-blue-500",
    };

    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={closeSelectedDay}
        />
        <div className="animate-in slide-in-from-right fixed inset-y-0 right-0 z-50 flex w-[85%] max-w-[400px] flex-col border-l border-neutral-200 bg-white shadow-xl duration-200 md:relative md:inset-auto md:z-auto md:w-[350px] md:max-w-none md:shadow-none lg:w-[400px] dark:border-neutral-800 dark:bg-neutral-950">
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

          <div className="flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-primary-700/40 hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700 dark:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-700/60 [&::-webkit-scrollbar-track]:bg-transparent">
            {!hasEvents ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <CalendarIcon size={36} className="mb-3 opacity-20" />
                <p className="text-xs sm:text-sm">{texts.noEvents}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allEvents.map((event, idx) => {
                  const item = event.data;
                  const title = item.title;

                  const endStr = item.end;
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
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${typeInfo.badge}`}
                        >
                          {item.source === "google" ? (
                            <FcGoogle size={10} />
                          ) : (
                            <CalendarIcon size={10} />
                          )}
                          {typeInfo.label}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {title}
                      </h4>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                        <Clock size={14} className="shrink-0 text-neutral-400" />
                        <span>{timeRange}</span>
                      </div>
                      {item.location && (
                        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-400">
                          <MapPin size={14} className="shrink-0 text-neutral-400" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      )}
                      {item.description && (
                        <p className="mt-2 rounded-md bg-neutral-50 p-2 text-[11px] leading-relaxed text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-400">
                          {item.description.substring(0, 300)}
                        </p>
                      )}
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
    <>
      <div
        className={`flex overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}
      >
        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header & Controls */}
          {/* Header & Controls */}
          <div className="flex flex-col gap-3 border-b border-neutral-200 bg-white px-2 py-2 sm:px-3 sm:py-2.5 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              {/* Esquerda: Navegação e Data */}
              <div className="flex items-center justify-between sm:justify-start sm:gap-4 xl:flex-1">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(-1)}
                    className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 sm:p-2 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    type="button"
                    title={locale.startsWith("pt") ? "Anterior" : "Previous"}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <span className="min-w-[150px] text-center text-[13px] font-bold tracking-wide text-neutral-800 sm:text-[14px] dark:text-neutral-100">
                    {headerTitle}
                  </span>

                  <button
                    onClick={() => navigate(1)}
                    className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 sm:p-2 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    type="button"
                    title={locale.startsWith("pt") ? "Próximo" : "Next"}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <button
                  onClick={goToToday}
                  className="hidden rounded-md border border-neutral-200 px-3 py-1.5 text-[11px] font-bold tracking-wider text-neutral-500 uppercase transition-colors hover:bg-neutral-50 hover:text-neutral-700 sm:inline-flex dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-200"
                  type="button"
                >
                  {texts.today}
                </button>
              </div>

              {/* Centro/Direita: Controles e Ações */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between xl:gap-4">
                {/* Visualização (Views) */}
                <div className="w-full overflow-x-auto pb-1 sm:w-auto sm:pb-0 [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max rounded-lg bg-neutral-100/80 p-1 dark:bg-neutral-900/80">
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
                          type="button"
                          className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-bold tracking-wider whitespace-nowrap uppercase transition-all sm:flex-none ${
                            view === v
                              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300"
                          }`}
                        >
                          {viewLabels[v]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                  {/* Botão Hoje para Mobile (visto apenas no mobile) */}
                  <button
                    onClick={goToToday}
                    className="rounded-md border border-neutral-200 px-3 py-2 text-[11px] font-bold tracking-wider text-neutral-500 uppercase transition-colors hover:bg-neutral-50 sm:hidden dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900"
                    type="button"
                  >
                    {texts.today}
                  </button>

                  <div className="col-span-2 flex gap-2 sm:col-span-1">
                    {googleConnected ? (
                      <button
                        onClick={() => {
                          refreshEventsForYear(currentDate.getFullYear()).catch(() => {});
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-[11px] font-bold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-800 sm:flex-none sm:px-3 sm:py-1.5 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                        title={locale.startsWith("pt") ? "Atualizar eventos" : "Refresh events"}
                        type="button"
                      >
                        <RefreshCw size={13} className="text-neutral-400" />
                        <span className="hidden sm:inline">
                          {locale.startsWith("pt") ? "Atualizar" : "Refresh"}
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={connectGoogleCalendar}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-100 sm:flex-none sm:px-3 sm:py-1.5 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                        type="button"
                      >
                        <FcGoogle size={14} />
                        <span className="hidden sm:inline">
                          {locale.startsWith("pt") ? "Sincronizar" : "Sync Google"}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-500 px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-amber-600 active:scale-95 sm:flex-none sm:py-1.5 dark:border-amber-600 dark:hover:bg-amber-500"
                      type="button"
                    >
                      <Plus size={14} />
                      <span>{locale.startsWith("pt") ? "Criar Evento" : "Create Event"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Conditional Rendering of Views */}
          {view === "day" && renderDay()}
          {view === "week" && renderWeek()}
          {view === "month" && renderMonth()}
          {view === "semester" && renderMacroView(6)}
          {view === "year" && renderMacroView(12)}
        </div>

        {/* Detalhes de um dia selecionado */}
        {selectedDate && renderSidePanel()}
      </div>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultDate={selectedDate || currentDate}
        googleConnected={googleConnected}
        onCreated={() => {
          refreshEventsForYear(currentDate.getFullYear()).catch(() => {
            // Error state is already managed by CalendarContext.
          });
        }}
      />
    </>
  );
}
