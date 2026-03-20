"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  List,
  Grid3X3,
  Clock,
  Tag,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { FaProjectDiagram, FaGoogle } from "react-icons/fa";

import { useNotes } from "../../_contexts/notes-context";
import { useProjects } from "../../_contexts/projects-context";
import { CalendarHeader } from "../_components/ui/headers/calendar-header";
import {
  fetchGoogleCalendarEvents,
  type GoogleCalendarEvent,
} from "../../_services/calendar-service/calendar-service";

// ─── Utilitários de data ────────────────────────────────────────────────────
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MONTH_NAMES_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEK_DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type ViewMode = "month" | "agenda";

// ─── Componente principal ───────────────────────────────────────────────────
export default function CalendarPage() {
  const { notes } = useNotes();
  const { projects } = useProjects();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEvent[]>([]);
  const [gcalConnected, setGcalConnected] = useState(false);
  const [fetchedYear, setFetchedYear] = useState<number | null>(null);

  // ─── Navegação ──────────────────────────────────────────────────────────
  const nextMonth = useCallback(
    () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)),
    [currentDate]
  );
  const prevMonth = useCallback(
    () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)),
    [currentDate]
  );
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  // ─── Fetch Google Calendar Events ────────────────────────────────────────
  useEffect(() => {
    const year = currentDate.getFullYear();
    if (fetchedYear === year) return;
    const timeMin = new Date(year, 0, 1).toISOString();
    const timeMax = new Date(year, 11, 31, 23, 59, 59).toISOString();
    fetchGoogleCalendarEvents(timeMin, timeMax)
      .then((res) => {
        setGcalConnected(res.connected);
        if (res.connected) {
          setGcalEvents(res.events);
          setFetchedYear(year);
        }
      })
      .catch(() => {});
  }, [currentDate, fetchedYear]);

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft" && !e.metaKey && !e.ctrlKey) prevMonth();
      if (e.key === "ArrowRight" && !e.metaKey && !e.ctrlKey) nextMonth();
      if (e.key === "t" || e.key === "T") goToToday();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prevMonth, nextMonth, goToToday]);

  // ─── Mapa de eventos ───────────────────────────────────────────────────
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
      // Para eventos allDay ("2026-03-07"), usar data local para evitar off-by-one de timezone
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

  // ─── Stats rápidos ──────────────────────────────────────────────────────
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    let notesCount = 0;
    let projectsCount = 0;
    let activeDays = 0;

    eventsByDate.forEach((events, dateKey) => {
      const [y, m] = dateKey.split("-").map(Number);
      if (y === year && m === month + 1) {
        notesCount += events.notes.length;
        projectsCount += events.projects.length;
        if (
          events.notes.length > 0 ||
          events.projects.length > 0 ||
          events.calendarEvents.length > 0
        )
          activeDays++;
      }
    });

    return { notesCount, projectsCount, activeDays };
  }, [eventsByDate, currentDate]);

  // ─── Grid do calendário com dias adjacentes ─────────────────────────────
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, month, year, isCurrentMonth: true });
    }

    // Dias do próximo mês para completar a grade (sempre 42 cells = 6 semanas)
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      cells.push({ day: i, month: m, year: y, isCurrentMonth: false });
    }

    return cells;
  }, [currentDate]);

  // ─── Dados da agenda ───────────────────────────────────────────────────
  const agendaData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const entries: {
      dateKey: string;
      date: Date;
      events: { notes: any[]; projects: any[]; calendarEvents: GoogleCalendarEvent[] };
    }[] = [];

    const daysInMonth = getDaysInMonth(year, month);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dateKey = toDateKey(date);
      const events = eventsByDate.get(dateKey);
      if (
        events &&
        (events.notes.length > 0 || events.projects.length > 0 || events.calendarEvents.length > 0)
      ) {
        entries.push({ dateKey, date, events });
      }
    }
    return entries;
  }, [currentDate, eventsByDate]);

  // ─── Dados derivados ───────────────────────────────────────────────────
  const today = new Date();
  const selectedDateStr = toDateKey(selectedDate);
  const selectedEvents = eventsByDate.get(selectedDateStr) || {
    notes: [],
    projects: [],
    calendarEvents: [] as GoogleCalendarEvent[],
  };
  const totalSelectedEvents =
    selectedEvents.notes.length +
    selectedEvents.projects.length +
    selectedEvents.calendarEvents.length;

  const formatTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-5.5rem)] flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {/* ═══════════ HEADER ═══════════ */}
        <CalendarHeader
          rightContent={
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              {/* View toggle */}
              <div className="flex items-center rounded-md border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  onClick={() => setViewMode("month")}
                  className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                    viewMode === "month"
                      ? "bg-yellow-500 text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                  title="Visão mensal"
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  onClick={() => setViewMode("agenda")}
                  className={`rounded px-2 py-1 text-xs font-medium transition-all ${
                    viewMode === "agenda"
                      ? "bg-yellow-500 text-white shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  }`}
                  title="Visão agenda"
                >
                  <List size={14} />
                </button>
              </div>

              <button
                onClick={goToToday}
                className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-yellow-300 hover:text-yellow-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-yellow-500/50 dark:hover:text-yellow-400"
                title="Ir para hoje (T)"
              >
                Hoje
              </button>

              <div className="flex items-center rounded-md border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
                <button
                  onClick={prevMonth}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Mês anterior (←)"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="w-28 text-center text-xs text-neutral-900 sm:w-32 sm:text-sm dark:text-neutral-100">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                <button
                  onClick={nextMonth}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                  title="Próximo mês (→)"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          }
        />

        {/* ═══════════ STATS BAR ═══════════ */}
        <div className="grid grid-cols-3 gap-3">
          <div className="group flex items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-md transition-colors hover:border-yellow-300/50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-yellow-500/30">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
              <FileText className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold text-yellow-500">
                {String(monthStats.notesCount).padStart(2, "0")}
              </p>
              <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-500">
                Notas no mês
              </p>
            </div>
          </div>

          <div className="group flex items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-md transition-colors hover:border-purple-300/50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-purple-500/30">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-purple-400/20 bg-purple-400/10 text-purple-400">
              <FaProjectDiagram className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold text-purple-500">
                {String(monthStats.projectsCount).padStart(2, "0")}
              </p>
              <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-500">
                Projetos no mês
              </p>
            </div>
          </div>

          <div className="group flex items-center gap-2.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 shadow-md transition-colors hover:border-emerald-300/50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-emerald-500/30">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
              <Sparkles className="h-3 w-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-bold text-emerald-500">
                {String(monthStats.activeDays).padStart(2, "0")}
              </p>
              <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-500">
                Dias ativos
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
          {/* ─── VISÃO MENSAL ─── */}
          {viewMode === "month" && (
            <div className="flex flex-1 flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md dark:border-neutral-800 dark:bg-neutral-950">
              {/* Dias da semana */}
              <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800">
                {WEEK_DAYS.map((day, i) => (
                  <div
                    key={day}
                    className={`py-2.5 text-center text-[10px] font-bold tracking-widest uppercase ${
                      i === 0 || i === 6
                        ? "text-orange-400/70 dark:text-orange-500/50"
                        : "text-neutral-400 dark:text-neutral-600"
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Grade */}
              <div className="grid flex-1 grid-cols-7 grid-rows-6">
                {calendarGrid.map((cell, idx) => {
                  const cellDate = new Date(cell.year, cell.month, cell.day);
                  const dateStr = toDateKey(cellDate);
                  const isToday = isSameDay(cellDate, today);
                  const isSelected = dateStr === selectedDateStr;
                  const dayEvents = eventsByDate.get(dateStr);
                  const hasEvents =
                    dayEvents &&
                    (dayEvents.notes.length > 0 ||
                      dayEvents.projects.length > 0 ||
                      dayEvents.calendarEvents.length > 0);
                  const totalEvents =
                    (dayEvents?.notes.length || 0) +
                    (dayEvents?.projects.length || 0) +
                    (dayEvents?.calendarEvents.length || 0);
                  const isSunday = idx % 7 === 0;

                  const isWeekend = idx % 7 === 0 || idx % 7 === 6;
                  return (
                    <button
                      key={`cell-${idx}`}
                      onClick={() => {
                        setSelectedDate(cellDate);
                        if (!cell.isCurrentMonth) {
                          setCurrentDate(new Date(cell.year, cell.month, 1));
                        }
                        setSidebarOpen(true);
                      }}
                      className={`group shadow-sxs relative m-0.5 flex flex-col items-center justify-start rounded-md border-r border-b border-neutral-100 p-1.5 transition-all duration-150 sm:p-2 dark:border-neutral-800/50 ${
                        cell.isCurrentMonth
                          ? "bg-white dark:bg-neutral-900"
                          : "bg-neutral-50/50 dark:bg-neutral-950/50"
                      } ${
                        isSelected
                          ? "z-10 ring-2 ring-yellow-500 ring-inset dark:ring-yellow-400"
                          : "hover:bg-yellow-50/40 dark:hover:bg-yellow-950/10"
                      }`}
                    >
                      {/* Número do dia */}
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-all sm:h-7 sm:w-7 sm:text-sm ${
                          isToday
                            ? "bg-yellow-500 font-bold text-white shadow-sm shadow-yellow-500/30"
                            : cell.isCurrentMonth
                              ? idx % 7 === 6
                                ? "text-orange-400/70 group-hover:bg-neutral-100 dark:text-orange-500/50 dark:group-hover:bg-neutral-800"
                                : idx % 7 === 0
                                  ? "text-red-400/70 group-hover:bg-neutral-100 dark:text-red-500/50 dark:group-hover:bg-neutral-800"
                                  : "text-neutral-700 group-hover:bg-neutral-100 dark:text-neutral-300 dark:group-hover:bg-neutral-800"
                              : "text-neutral-300 dark:text-neutral-700"
                        }`}
                      >
                        {cell.day}
                      </span>

                      {/* Indicadores de eventos */}
                      {hasEvents && (
                        <div className="mt-0.5 flex flex-col items-center gap-0.5 sm:mt-1">
                          {/* Dots para mobile */}
                          <div className="flex items-center gap-0.5 sm:hidden">
                            {dayEvents?.calendarEvents.length > 0 && (
                              <div className="h-1 w-1 rounded-full bg-blue-400" />
                            )}
                            {dayEvents?.notes.length > 0 && (
                              <div className="h-1 w-1 rounded-full bg-yellow-400" />
                            )}
                            {dayEvents?.projects.length > 0 && (
                              <div className="h-1 w-1 rounded-full bg-purple-400" />
                            )}
                          </div>

                          {/* Barras para desktop */}
                          <div className="hidden w-full flex-col gap-0.5 px-0.5 sm:flex">
                            {dayEvents?.calendarEvents.slice(0, 1).map((event, i) => (
                              <div
                                key={`gc-${i}`}
                                className="truncate rounded-sm bg-blue-400/15 px-1 py-px text-[9px] leading-tight font-medium text-blue-600 dark:bg-blue-400/10 dark:text-blue-400"
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents?.notes.slice(0, 1).map((note, i) => (
                              <div
                                key={`n-${i}`}
                                className="truncate rounded-sm bg-yellow-400/15 px-1 py-px text-[9px] leading-tight font-medium text-yellow-600 dark:bg-yellow-400/10 dark:text-yellow-400"
                              >
                                {note.title}
                              </div>
                            ))}
                            {dayEvents?.projects.slice(0, 1).map((project, i) => (
                              <div
                                key={`p-${i}`}
                                className="truncate rounded-sm bg-purple-400/15 px-1 py-px text-[9px] leading-tight font-medium text-purple-600 dark:bg-purple-400/10 dark:text-purple-400"
                              >
                                {project.name}
                              </div>
                            ))}
                            {totalEvents > 3 && (
                              <span className="text-center text-[8px] font-medium text-neutral-400">
                                +{totalEvents - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── VISÃO AGENDA ─── */}
          {viewMode === "agenda" && (
            <div className="flex flex-1 flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md dark:border-neutral-800 dark:bg-neutral-950">
              <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-500">
                  Agenda de {MONTH_NAMES[currentDate.getMonth()]}
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto">
                {agendaData.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-neutral-400">
                    <CalendarIcon size={32} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">Nenhuma atividade neste mês</p>
                    <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-600">
                      Crie notas ou projetos para visualizá-los aqui
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {agendaData.map(({ dateKey, date, events }) => {
                      const isAgendaToday = isSameDay(date, today);
                      return (
                        <div
                          key={dateKey}
                          className={`flex gap-4 px-4 py-3 transition-colors hover:bg-white dark:hover:bg-neutral-900 ${
                            isAgendaToday ? "bg-yellow-50/30 dark:bg-yellow-950/10" : ""
                          }`}
                        >
                          {/* Data sticky */}
                          <div className="flex w-14 flex-shrink-0 flex-col items-center pt-0.5">
                            <span
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                                isAgendaToday
                                  ? "bg-yellow-500 text-white shadow-sm shadow-yellow-500/30"
                                  : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            <span className="mt-0.5 text-[10px] font-medium text-neutral-400 uppercase">
                              {WEEK_DAYS[date.getDay()]}
                            </span>
                          </div>

                          {/* Eventos do dia */}
                          <div className="flex-1 space-y-1.5">
                            {events.calendarEvents?.map((event, i) => (
                              <a
                                key={`agc-${i}`}
                                href={event.htmlLink || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <div className="group flex items-center gap-2.5 rounded-md border border-transparent bg-blue-50/50 px-3 py-2 transition-all hover:border-blue-200 hover:shadow-sm dark:bg-blue-950/20 dark:hover:border-blue-800/50">
                                  <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-100 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400">
                                    <FaGoogle size={11} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-neutral-800 group-hover:text-blue-600 dark:text-neutral-200 dark:group-hover:text-blue-400">
                                      {event.title}
                                    </p>
                                    <p className="flex items-center gap-1 text-[10px] text-neutral-400">
                                      <Clock size={9} />
                                      {event.allDay ? "Dia inteiro" : formatTime(event.start!)}
                                    </p>
                                  </div>
                                  <ArrowRight
                                    size={12}
                                    className="text-neutral-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-blue-400 group-hover:opacity-100 dark:text-neutral-600"
                                  />
                                </div>
                              </a>
                            ))}
                            {events.projects.map((project) => (
                              <Link key={`ap-${project.id}`} href={`/app/projects/${project.id}`}>
                                <div className="group flex items-center gap-2.5 rounded-md border border-transparent bg-purple-50/50 px-3 py-2 transition-all hover:border-purple-200 hover:shadow-sm dark:bg-purple-950/20 dark:hover:border-purple-800/50">
                                  <div className="flex h-7 w-7 items-center justify-center rounded bg-purple-100 text-purple-500 dark:bg-purple-900/40 dark:text-purple-400">
                                    <FaProjectDiagram size={11} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-neutral-800 group-hover:text-purple-600 dark:text-neutral-200 dark:group-hover:text-purple-400">
                                      {project.name}
                                    </p>
                                    <p className="flex items-center gap-1 text-[10px] text-neutral-400">
                                      <Clock size={9} />
                                      {formatTime(project.updated_at || project.created_at)}
                                    </p>
                                  </div>
                                  <ArrowRight
                                    size={12}
                                    className="text-neutral-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-purple-400 group-hover:opacity-100 dark:text-neutral-600"
                                  />
                                </div>
                              </Link>
                            ))}
                            {events.notes.map((note) => (
                              <Link key={`an-${note.id}`} href={`/app/notes/${note.id}`}>
                                <div className="group flex items-center gap-2.5 rounded-md border border-transparent bg-yellow-50/50 px-3 py-2 transition-all hover:border-yellow-200 hover:shadow-sm dark:bg-yellow-950/20 dark:hover:border-yellow-800/50">
                                  <div className="flex h-7 w-7 items-center justify-center rounded bg-yellow-100 text-yellow-500 dark:bg-yellow-900/40 dark:text-yellow-400">
                                    <FileText size={11} />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-neutral-800 group-hover:text-yellow-600 dark:text-neutral-200 dark:group-hover:text-yellow-400">
                                      {note.title}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <p className="flex items-center gap-1 text-[10px] text-neutral-400">
                                        <Clock size={9} />
                                        {formatTime(note.updated_at || note.created_at)}
                                      </p>
                                      {note.tags && note.tags.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Tag size={8} className="text-neutral-300" />
                                          <span className="text-[9px] text-neutral-400">
                                            {note.tags.slice(0, 2).join(", ")}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowRight
                                    size={12}
                                    className="text-neutral-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-yellow-400 group-hover:opacity-100 dark:text-neutral-600"
                                  />
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── SIDEBAR: DETALHES DO DIA ─── */}
          <div
            className={`flex w-full flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md transition-all lg:w-80 dark:border-neutral-800 dark:bg-neutral-950 ${
              sidebarOpen ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Header do dia selecionado */}
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                    {selectedDate.getDate()} <span className="text-neutral-400">de</span>{" "}
                    {MONTH_NAMES[selectedDate.getMonth()]}
                  </h3>
                  <p className="text-[10px] font-medium text-neutral-400 uppercase dark:text-neutral-600">
                    {WEEK_DAYS_FULL[selectedDate.getDay()]}
                    {isSameDay(selectedDate, today) && (
                      <span className="ml-1.5 rounded-full bg-yellow-500/15 px-1.5 py-0.5 text-[9px] font-bold text-yellow-500 normal-case">
                        hoje
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 font-mono text-xs font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  {totalSelectedEvents}
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-3">
              {totalSelectedEvents === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800/50">
                    <CalendarIcon size={20} className="text-neutral-300 dark:text-neutral-600" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-neutral-400 dark:text-neutral-600">
                    Nenhum registro
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-300 dark:text-neutral-700">
                    Sem atividades nesta data
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Google Calendar */}
                  {selectedEvents.calendarEvents.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-blue-200/50 dark:bg-blue-800/30" />
                        <span className="font-mono text-[9px] font-bold tracking-widest text-blue-400 uppercase dark:text-blue-500">
                          Google Calendar ({selectedEvents.calendarEvents.length})
                        </span>
                        <div className="h-px flex-1 bg-blue-200/50 dark:bg-blue-800/30" />
                      </div>
                      <div className="space-y-1.5">
                        {selectedEvents.calendarEvents.map((event, i) => (
                          <a
                            href={event.htmlLink || "#"}
                            key={`sgc-${i}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <div className="group flex items-center gap-2.5 rounded-md border border-neutral-100 bg-white p-2.5 transition-all hover:border-blue-200 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-blue-700/40">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400">
                                <FaGoogle size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-neutral-800 group-hover:text-blue-600 dark:text-neutral-200 dark:group-hover:text-blue-400">
                                  {event.title}
                                </p>
                                <p className="flex items-center gap-1 text-[10px] text-neutral-400">
                                  <Clock size={8} />
                                  {event.allDay ? "Dia inteiro" : formatTime(event.start!)}
                                </p>
                              </div>
                              <ArrowRight
                                size={12}
                                className="text-neutral-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-blue-400 group-hover:opacity-100"
                              />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Projetos */}
                  {selectedEvents.projects.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-purple-200/50 dark:bg-purple-800/30" />
                        <span className="font-mono text-[9px] font-bold tracking-widest text-purple-400 uppercase dark:text-purple-500">
                          Projetos ({selectedEvents.projects.length})
                        </span>
                        <div className="h-px flex-1 bg-purple-200/50 dark:bg-purple-800/30" />
                      </div>
                      <div className="space-y-1.5">
                        {selectedEvents.projects.map((project) => (
                          <Link href={`/app/projects/${project.id}`} key={`sp-${project.id}`}>
                            <div className="group flex items-center gap-2.5 rounded-md border border-neutral-100 bg-white p-2.5 transition-all hover:border-purple-200 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-purple-700/40">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-100 text-purple-500 dark:bg-purple-900/30 dark:text-purple-400">
                                <FaProjectDiagram size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-neutral-800 group-hover:text-purple-600 dark:text-neutral-200 dark:group-hover:text-purple-400">
                                  {project.name}
                                </p>
                                <p className="flex items-center gap-1 text-[10px] text-neutral-400">
                                  <Clock size={8} />
                                  {formatTime(project.updated_at || project.created_at)}
                                </p>
                              </div>
                              <ArrowRight
                                size={12}
                                className="text-neutral-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-purple-400 group-hover:opacity-100"
                              />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  {selectedEvents.notes.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <div className="h-px flex-1 bg-yellow-200/50 dark:bg-yellow-800/30" />
                        <span className="font-mono text-[9px] font-bold tracking-widest text-yellow-500 uppercase dark:text-yellow-500">
                          Notas ({selectedEvents.notes.length})
                        </span>
                        <div className="h-px flex-1 bg-yellow-200/50 dark:bg-yellow-800/30" />
                      </div>
                      <div className="space-y-1.5">
                        {selectedEvents.notes.map((note) => (
                          <Link href={`/app/notes/${note.id}`} key={`sn-${note.id}`}>
                            <div className="group flex items-center gap-2.5 rounded-md border border-neutral-100 bg-white p-2.5 transition-all hover:border-yellow-200 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-yellow-700/40">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-100 text-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-400">
                                <FileText size={12} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-neutral-800 group-hover:text-yellow-600 dark:text-neutral-200 dark:group-hover:text-yellow-400">
                                  {note.title}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="flex items-center gap-1 text-[10px] text-neutral-400">
                                    <Clock size={8} />
                                    {formatTime(note.updated_at || note.created_at)}
                                  </p>
                                  {note.tags && note.tags.length > 0 && (
                                    <div className="flex items-center gap-0.5">
                                      {note.tags.slice(0, 2).map((tag: string, i: number) => (
                                        <span
                                          key={i}
                                          className="rounded bg-neutral-100 px-1 py-px text-[8px] font-medium text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                      {note.tags.length > 2 && (
                                        <span className="text-[8px] text-neutral-300 dark:text-neutral-600">
                                          +{note.tags.length - 2}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ArrowRight
                                size={12}
                                className="text-neutral-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-yellow-400 group-hover:opacity-100"
                              />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer mini-legenda */}
            <div className="border-t border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
              <div className="flex items-center justify-center gap-4">
                {gcalConnected && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-[10px] text-neutral-400">Google</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span className="text-[10px] text-neutral-400">Notas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-[10px] text-neutral-400">Projetos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
