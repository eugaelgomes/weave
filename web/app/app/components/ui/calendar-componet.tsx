"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, FileText, Calendar as CalendarIcon, X } from "lucide-react";
import { FaProjectDiagram } from "react-icons/fa";

import { useNotes } from "@/app/contexts/NotesContext";
import { useProjects } from "@/app/contexts/ProjectsContext";
import { useAuth } from "@/app/contexts/AuthContext";
import type { UserPreferences } from "@/types/user-preferences";

// ─── Interfaces e Tipos ──
export interface CalendarPreviewProps {
  className?: string;
}

type ViewType = "day" | "week" | "month" | "semester" | "year";

// ─── Utilitários de Data ──
const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEK_DAYS_PT = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];
const WEEK_DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const toDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
};

const getMonthNames = (locale: string = "pt-BR") => {
  return locale.startsWith("en") ? MONTH_NAMES_EN : MONTH_NAMES_PT;
};

const getWeekDays = (locale: string = "pt-BR") => {
  return locale.startsWith("en") ? WEEK_DAYS_EN : WEEK_DAYS_PT;
};

const formatTime = (dateString: string, timeFormat: "12h" | "24h" = "24h", locale: string = "pt-BR") => {
  const date = new Date(dateString);
  
  if (timeFormat === "12h") {
    return date.toLocaleTimeString(locale, { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  }
  
  return date.toLocaleTimeString(locale, { 
    hour: "2-digit", 
    minute: "2-digit",
    hour12: false 
  });
};

export function CalendarPreview({ className = "h-full min-h-[500px]" }: CalendarPreviewProps) {
  const { notes } = useNotes();
  const { projects } = useProjects();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
      noEvents: isPtBr ? "Nenhum evento programado para este dia." : "No events scheduled for this day.",
      updatedAt: isPtBr ? "Atualizado às" : "Updated at",
      updatedAtFull: isPtBr ? "Atualizada às" : "Updated at",
      records: isPtBr ? "Registros" : "Records",
      noActivities: isPtBr ? "Sem atividades" : "No activities",
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
  const navigateSelectedDay = useCallback((direction: 1 | -1) => {
    if (!selectedDate) return;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  }, [selectedDate]);

  const closeSelectedDay = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // ─── Estrutura de Eventos O(1) Lookup ────────────────────────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { notes: any[]; projects: any[] }>();

    const addToMap = (dateString: string, item: any, type: "note" | "project") => {
      if (!dateString) return;
      const d = new Date(dateString);
      const dateKey = toDateKey(d);
      if (!map.has(dateKey)) map.set(dateKey, { notes: [], projects: [] });
      if (type === "note") map.get(dateKey)!.notes.push(item);
      if (type === "project") map.get(dateKey)!.projects.push(item);
    };

    notes?.forEach((note) => addToMap(note.updated_at || note.created_at, note, "note"));
    projects?.forEach((project) =>
      addToMap(project.updated_at || project.created_at, project, "project")
    );
    return map;
  }, [notes, projects]);

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
        className={`flex items-center gap-1.5 truncate rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
          isNote
            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:hover:bg-yellow-500/20"
            : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
        }`}
      >
        {isNote ? <FileText size={10} className="shrink-0" /> : <FaProjectDiagram size={10} className="shrink-0" />}
        <span className="truncate flex-1">{title}</span>
        <span className="shrink-0 text-[9px] opacity-70">{time}</span>
      </div>
    );
  };

  // ─── 2. RENDER: MÊS E SEMANA (Grid Expandido) ───
  const renderGrid = (daysToRender: Date[], cols: number) => {
    const today = new Date();
    return (
      <div className="flex flex-1 flex-col overflow-hidden px-1 bg-neutral-100 dark:bg-neutral-800 gap-1 border-t border-neutral-200 dark:border-neutral-800">
        <div className={`grid grid-cols-${cols}  bg-white dark:bg-neutral-950 rounded-md`}>
          {WEEK_DAYS.slice(0, cols).map((day, i) => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-neutral-500 ">
              {day}
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
                className={`flex min-h-[100px] rounded-md flex-col gap-1 bg-white p-1.5 transition-colors cursor-pointer dark:bg-neutral-950 ${
                  !isCurrentMonth && view === "month" ? "opacity-50" : ""
                } ${isToday ? "bg-yellow-50/30 dark:bg-yellow-900/5" : "hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:shadow-md hover:scale-[1.02]"}`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? "bg-yellow-500 text-white shadow-sm"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {cellDate.getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
                  {dayEvents?.projects.map((p, i) => <EventChip key={`p-${i}`} event={p} type="project" />)}
                  {dayEvents?.notes.map((n, i) => <EventChip key={`n-${i}`} event={n} type="note" />)}
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

  // ─── 3. RENDER: DIA (Estilo Google Calendar) ───
  const renderDay = () => {
    const dateStr = toDateKey(currentDate);
    const dayEvents = eventsByDate.get(dateStr);
    const isPtBr = locale.startsWith("pt");
    
    // Combinar e ordenar eventos cronologicamente
    const allEvents: Array<{ time: string; type: 'note' | 'project'; data: any }> = [];
    
    if (dayEvents) {
      dayEvents.projects.forEach(p => {
        allEvents.push({
          time: p.updated_at || p.created_at,
          type: 'project',
          data: p
        });
      });
      dayEvents.notes.forEach(n => {
        allEvents.push({
          time: n.updated_at || n.created_at,
          type: 'note',
          data: n
        });
      });
    }

    // Ordenar por horário
    allEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Hora atual
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const isToday = isSameDay(currentDate, now);

    // Gerar array de horas (0-23)
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Agrupar eventos por hora
    const eventsByHour = new Map<number, typeof allEvents>();
    allEvents.forEach(event => {
      const eventDate = new Date(event.time);
      const hour = eventDate.getHours();
      if (!eventsByHour.has(hour)) {
        eventsByHour.set(hour, []);
      }
      eventsByHour.get(hour)!.push(event);
    });

    return (
      <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-950">
        <div className="relative">
          {/* Grade horária */}
          {hours.map((hour) => {
            const hourEvents = eventsByHour.get(hour) || [];
            const isCurrentHour = isToday && hour === currentHour;
            const hourLabel = timeFormat === "12h" 
              ? (hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`)
              : `${String(hour).padStart(2, '0')}:00`;

            return (
              <div 
                key={hour} 
                className={`relative flex border-b border-neutral-200 dark:border-neutral-800 min-h-[60px] ${
                  isCurrentHour ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''
                }`}
              >
                {/* Coluna do horário */}
                <div className="w-20 shrink-0 px-3 py-2 text-right">
                  <span className={`text-xs font-medium ${
                    isCurrentHour 
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}>
                    {hourLabel}
                  </span>
                </div>

                {/* Área de eventos */}
                <div className="flex-1 p-2 space-y-1">
                  {hourEvents.map((event, idx) => {
                    const isNote = event.type === 'note';
                    const item = event.data;
                    const title = isNote ? item.title : item.name;
                    const eventTime = new Date(event.time);
                    const minutes = eventTime.getMinutes();
                    const timeStr = formatTime(event.time, timeFormat, locale);

                    return (
                      <div
                        key={`${event.type}-${idx}`}
                        className={`rounded-md border-l-4 p-2 transition-all hover:shadow-md cursor-pointer ${
                          isNote
                            ? 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/30'
                            : 'border-purple-500 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="shrink-0 mt-0.5">
                            {isNote ? (
                              <FileText size={14} className="text-yellow-600 dark:text-yellow-400" />
                            ) : (
                              <FaProjectDiagram size={14} className="text-purple-600 dark:text-purple-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                                {timeStr}
                              </span>
                              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate flex-1">
                                {title}
                              </h4>
                            </div>
                            {item.content && (
                              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                                {item.content.substring(0, 80)}...
                              </p>
                            )}
                            {item.description && (
                              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Linha indicadora da hora atual */}
                {isCurrentHour && isToday && (
                  <div 
                    className="absolute left-20 right-0 border-t-2 border-red-500 z-10"
                    style={{ top: `${(currentMinute / 60) * 60}px` }}
                  >
                    <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mensagem se não houver eventos */}
        {allEvents.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 pointer-events-none">
            <CalendarIcon size={48} className="mb-3 opacity-20" />
            <p className="text-sm">{texts.noEvents}</p>
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
      <div className={`grid flex-1 gap-px bg-neutral-200 p-px dark:bg-neutral-800 ${monthsCount === 6 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-3 md:grid-cols-4"}`}>
        {months.map((month) => {
          // Calcula densidade simples de eventos para o mês inteiro (Heatmap conceptual)
          let monthEventsCount = 0;
          const daysInM = getDaysInMonth(year, month);
          for(let d = 1; d <= daysInM; d++){
              const events = eventsByDate.get(toDateKey(new Date(year, month, d)));
              if(events) monthEventsCount += (events.notes.length + events.projects.length);
          }

          return (
            <button 
              key={month} 
              onClick={() => {
                setCurrentDate(new Date(year, month, 1));
                setView("month");
              }}
              className="group flex flex-col items-center justify-center bg-white p-4 hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900"
            >
              <h4 className="font-semibold text-neutral-700 group-hover:text-yellow-500 dark:text-neutral-300">
                {MONTH_NAMES[month]}
              </h4>
              <div className="mt-2 flex h-8 w-full items-end justify-center gap-1 opacity-60">
                {/* Visualização de barras de atividade do mês */}
                {monthEventsCount === 0 ? (
                    <span className="text-[10px] text-neutral-400">{texts.noActivities}</span>
                ) : (
                    <div className="flex flex-col items-center">
                        <span className="text-lg font-bold text-neutral-800 dark:text-neutral-200">{monthEventsCount}</span>
                        <span className="text-[9px] uppercase text-neutral-500">{texts.records}</span>
                    </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ─── 5. RENDER: DIA EXPANDIDO (Integrado) ───
  const renderExpandedDay = () => {
    if (!selectedDate) return null;

    const dateStr = toDateKey(selectedDate);
    const dayEvents = eventsByDate.get(dateStr);
    const isPtBr = locale.startsWith("pt");

    // Combinar e ordenar eventos cronologicamente
    const allEvents: Array<{ time: string; type: 'note' | 'project'; data: any }> = [];
    
    if (dayEvents) {
      dayEvents.projects.forEach(p => {
        allEvents.push({
          time: p.updated_at || p.created_at,
          type: 'project',
          data: p
        });
      });
      dayEvents.notes.forEach(n => {
        allEvents.push({
          time: n.updated_at || n.created_at,
          type: 'note',
          data: n
        });
      });
    }

    // Ordenar por horário (mais recente primeiro)
    allEvents.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const hasEvents = allEvents.length > 0;
    const dayName = WEEK_DAYS[selectedDate.getDay()];
    const monthName = MONTH_NAMES[selectedDate.getMonth()];
    const dayTitle = isPtBr 
      ? `${dayName}, ${selectedDate.getDate()} de ${monthName} de ${selectedDate.getFullYear()}`
      : `${dayName}, ${monthName} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;

    return (
      <div className="border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateSelectedDay(-1)}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              title={isPtBr ? "Dia anterior" : "Previous day"}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="min-w-[200px] text-center">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {dayTitle}
              </h3>
              <p className="text-xs text-neutral-500">
                {hasEvents 
                  ? `${allEvents.length} ${isPtBr ? 'eventos' : 'events'}`
                  : isPtBr ? 'Sem eventos' : 'No events'
                }
              </p>
            </div>
            <button
              onClick={() => navigateSelectedDay(1)}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              title={isPtBr ? "Próximo dia" : "Next day"}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            onClick={closeSelectedDay}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title={isPtBr ? "Fechar" : "Close"}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - Timeline cronológica */}
        <div className="max-h-[400px] overflow-y-auto p-4">
          {!hasEvents ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <CalendarIcon size={32} className="mb-3 opacity-20" />
              <p className="text-sm">{texts.noEvents}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allEvents.map((event, idx) => {
                const isNote = event.type === 'note';
                const item = event.data;
                const title = isNote ? item.title : item.name;
                const time = formatTime(event.time, timeFormat, locale);

                return (
                  <div
                    key={`${event.type}-${idx}`}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-all hover:shadow-md ${
                      isNote
                        ? 'border-yellow-200 bg-yellow-50/50 hover:bg-yellow-50 hover:border-yellow-300 dark:border-yellow-900/30 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20'
                        : 'border-purple-200 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-300 dark:border-purple-900/30 dark:bg-purple-900/10 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isNote
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {isNote ? <FileText size={16} /> : <FaProjectDiagram size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate">
                          {title}
                        </h4>
                        <span className="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          {time}
                        </span>
                      </div>
                      {item.content && (
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {item.content.substring(0, 120)}...
                        </p>
                      )}
                      {item.description && (
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
      
      {/* ═══════════ HEADER & CONTROLS ═══════════ */}
      <div className="flex flex-col gap-4 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          
          {/* Navegação de Datas */}
          <div className="flex items-center gap-3">
            <button onClick={goToToday} className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900">
              {texts.today}
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
                <ChevronLeft size={18} />
              </button>
              <span className="min-w-[140px] text-center text-sm font-bold text-neutral-800 dark:text-neutral-100">
                {headerTitle}
              </span>
              <button onClick={() => navigate(1)} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Seletor de Views */}
          <div className="flex bg-neutral-10o p-1 rounded-lg dark:bg-neutral-900">
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
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
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

      {view === "day" && renderDay()}
      {view === "week" && renderWeek()}
      {view === "month" && renderMonth()}
      {view === "semester" && renderMacroView(6)}
      {view === "year" && renderMacroView(12)}

      {/* Área expandida do dia selecionado */}
      {selectedDate && renderExpandedDay()}
      
    </div>
  );
}