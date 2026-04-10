"use client";

import { useEffect, useState } from "react";
import { Loader2, X, Clock, AlignLeft, MapPin, Video, Users } from "lucide-react";
import { toast } from "sonner";
import {
  searchUsers as searchUsersService,
  type User as SearchUser,
} from "@/app/_services/notes-service/notes-service";
import { useCalendar, type UnifiedCalendarEvent } from "@/app/_contexts/calendar-context";
import { type InternalCalendarEvent } from "@/app/_services/calendar-service/calendar-service";

/**
 * Propriedades do Modal de Criação de Eventos
 */
interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (event: InternalCalendarEvent) => void;
  defaultDate?: Date | null;
  googleConnected?: boolean;
  eventToEdit?: UnifiedCalendarEvent | null;
}

/**
 * Estado interno do formulário.
 * Centraliza todas as variáveis em um único objeto para evitar múltiplos re-renders.
 */
interface FormState {
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isAllDay: boolean;
  syncWithGoogle: boolean;
  createMeetLink: boolean;
  attendeesQuery: string;
  googleCalendarId: string;
}

// Regex para validação de e-mails de convidados
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mergeUniqueEmails = (base: string[], incoming: string[]): string[] => {
  const unique = new Map<string, string>();

  [...base, ...incoming]
    .map((email) => email.trim())
    .filter(Boolean)
    .forEach((email) => {
      const normalized = normalizeEmail(email);
      if (!unique.has(normalized)) unique.set(normalized, email);
    });

  return Array.from(unique.values());
};

/**
 * Processa a string de entrada de convidados (separada por vírgulas ou quebras de linha)
 * e retorna um array de e-mails únicos.
 */
const parseAttendeesInput = (input: string): string[] => {
  if (!input.trim()) return [];

  return mergeUniqueEmails(
    [],
    input
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
};

// ==========================================
// Utilitários Nativos de Data e Hora
// ==========================================
const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const combineDateTime = (date: string, time: string): Date => {
  return new Date(`${date}T${time}:00`);
};

const initialState = (baseDate?: Date | null): FormState => {
  const now = baseDate ? new Date(baseDate) : new Date();
  now.setSeconds(0, 0);

  const start = new Date(now);
  start.setMinutes(0, 0, 0); // Arredonda para o início da hora cheia

  const end = new Date(start);
  end.setHours(end.getHours() + 1); // Duração padrão de 1 hora

  return {
    title: "",
    description: "",
    location: "",
    startDate: toDateInputValue(start),
    startTime: toTimeInputValue(start),
    endDate: toDateInputValue(end),
    endTime: toTimeInputValue(end),
    isAllDay: false,
    syncWithGoogle: false,
    createMeetLink: false,
    attendeesQuery: "",
    googleCalendarId: "primary",
  };
};

// ==========================================
// Sub-componentes UI (Otimizados e Compactos)
// ==========================================

/**
 * Toggle Switch minimalista (mantém rounded-full por padrão de acessibilidade visual)
 */
const Toggle = ({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-600"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? "translate-x-3.5" : "translate-x-0.5"
      }`}
    />
  </button>
);

/**
 * Ícone Oficial da Google (Tamanho Reduzido)
 */
const GoogleLogoIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export default function CreateEventModal({
  isOpen,
  onClose,
  onCreated,
  defaultDate,
  googleConnected = false,
  eventToEdit = null,
}: CreateEventModalProps) {
  const { createEvent, updateEvent, connectGoogleCalendar, getGoogleCalendarsList, checkGoogleFreeBusy } = useCalendar();
  const [form, setForm] = useState<FormState>(() => initialState(defaultDate));
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [attendeeResults, setAttendeeResults] = useState<SearchUser[]>([]);
  const [isSearchingAttendees, setIsSearchingAttendees] = useState(false);
  const [availableCalendars, setAvailableCalendars] = useState<{id: string, summary: string}[]>([]);
  const [freebusyStatus, setFreebusyStatus] = useState<"free" | "busy" | null>(null);
  const [checkingFreebusy, setCheckingFreebusy] = useState(false);

  // Resetar formulário ou carregar evento existente ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;

    if (eventToEdit) {
      const hasGoogleSync = !!eventToEdit.googleEventId || eventToEdit.source === "google";
      const startDate = new Date(eventToEdit.start!);
      const endDate = eventToEdit.end ? new Date(eventToEdit.end) : startDate;

      setForm({
        title: eventToEdit.title,
        description: eventToEdit.description || "",
        location: eventToEdit.location || "",
        startDate: toDateInputValue(startDate),
        startTime: toTimeInputValue(startDate),
        endDate: toDateInputValue(endDate),
        endTime: toTimeInputValue(endDate),
        isAllDay: eventToEdit.allDay || false,
        syncWithGoogle: hasGoogleSync,
        createMeetLink: (eventToEdit as any).create_google_meet || false,
        attendeesQuery: "",
        googleCalendarId: (eventToEdit as any).google_calendar_id || "primary",
      });

      setSelectedAttendees((eventToEdit as any).attendees || []);
    } else {
      setForm(initialState(defaultDate));
      setSelectedAttendees([]);
    }
    
    setAttendeeResults([]);
    setFreebusyStatus(null);
  }, [isOpen, defaultDate, eventToEdit]);

  // Desativar features Google caso o usuário desconecte a conta durante o uso
  useEffect(() => {
    if (googleConnected) {
      if (isOpen) {
        getGoogleCalendarsList().then(cals => {
          setAvailableCalendars(cals);
        }).catch(() => {});
      }
      return;
    }
    setForm((prev) => ({
      ...prev,
      syncWithGoogle: false,
      createMeetLink: false,
      attendeesQuery: "",
      googleCalendarId: "primary",
    }));
    setSelectedAttendees([]);
    setAttendeeResults([]);
    setAvailableCalendars([]);
  }, [googleConnected, isOpen, getGoogleCalendarsList]);

  useEffect(() => {
    if (!isOpen || !googleConnected || !form.syncWithGoogle) {
      setAttendeeResults([]);
      setIsSearchingAttendees(false);
      return;
    }

    const term = form.attendeesQuery.trim();
    if (term.length < 3) {
      setAttendeeResults([]);
      setIsSearchingAttendees(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setIsSearchingAttendees(true);
        const users = await searchUsersService(term);
        const selected = new Set(selectedAttendees.map((email) => normalizeEmail(email)));

        const dedupedByEmail = new Map<string, SearchUser>();
        users.forEach((user) => {
          if (!user.email) return;
          const key = normalizeEmail(user.email);
          if (!selected.has(key) && !dedupedByEmail.has(key)) dedupedByEmail.set(key, user);
        });

        setAttendeeResults(Array.from(dedupedByEmail.values()).slice(0, 6));
      } catch {
        setAttendeeResults([]);
      } finally {
        setIsSearchingAttendees(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [form.attendeesQuery, form.syncWithGoogle, googleConnected, isOpen, selectedAttendees]);

  // Acessibilidade: Fechar modal ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addAttendee = (email: string) => {
    const value = email.trim();
    if (!value) return;

    if (!EMAIL_REGEX.test(value)) {
      toast.error("E-mail inválido");
      return;
    }

    setSelectedAttendees((prev) => mergeUniqueEmails(prev, [value]));
    setForm((prev) => ({ ...prev, attendeesQuery: "" }));
    setAttendeeResults([]);
  };

  const removeAttendee = (email: string) => {
    const target = normalizeEmail(email);
    setSelectedAttendees((prev) => prev.filter((item) => normalizeEmail(item) !== target));
  };

  const handleAttendeesKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!["Enter", "Tab", ",", ";"].includes(event.key)) return;

    const query = form.attendeesQuery.trim();
    if (!query) return;

    if (event.key !== "Tab") {
      event.preventDefault();
    }

    const normalizedQuery = normalizeEmail(query);
    const exactUser = attendeeResults.find(
      (user) => normalizeEmail(user.email) === normalizedQuery
    );

    if (exactUser) {
      addAttendee(exactUser.email);
      return;
    }

    addAttendee(query);
  };

  /**
   * Handler Inteligente: Preservação de Duração
   * Ao mudar o Início, o Fim é empurrado na mesma proporção.
   */
  const handleStartChange = (field: "startDate" | "startTime", value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const oldStart = combineDateTime(prev.startDate, prev.startTime);
      const oldEnd = combineDateTime(prev.endDate, prev.endTime);
      const duration = oldEnd.getTime() - oldStart.getTime();
      const newStart = combineDateTime(next.startDate, next.startTime);

      if (!isNaN(newStart.getTime())) {
        const validDuration = duration >= 0 ? duration : 60 * 60 * 1000; // Fallback: 1h
        const newEnd = new Date(newStart.getTime() + validDuration);
        next.endDate = toDateInputValue(newEnd);
        next.endTime = toTimeInputValue(newEnd);
      }
      return next;
    });
  };

  /**
   * Handler Inteligente: Retro-preservação
   * Evita que o evento termine antes de começar ajustando o Início automaticamente.
   */
  const handleEndChange = (field: "endDate" | "endTime", value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      const newStart = combineDateTime(next.startDate, next.startTime);
      const newEnd = combineDateTime(next.endDate, next.endTime);

      if (!isNaN(newEnd.getTime()) && !isNaN(newStart.getTime()) && newEnd < newStart) {
        const oldStart = combineDateTime(prev.startDate, prev.startTime);
        const oldEnd = combineDateTime(prev.endDate, prev.endTime);
        const duration = oldEnd.getTime() - oldStart.getTime();
        const validDuration = duration >= 0 ? duration : 60 * 60 * 1000; // Fallback: 1h

        const adjustedStart = new Date(newEnd.getTime() - validDuration);
        next.startDate = toDateInputValue(adjustedStart);
        next.startTime = toTimeInputValue(adjustedStart);
      }
      return next;
    });
  };


  const handleCheckFreebusy = async () => {
    if (!form.syncWithGoogle || !googleConnected) return;
    
    const start = form.isAllDay
      ? combineDateTime(form.startDate, "00:00")
      : combineDateTime(form.startDate, form.startTime);

    const end = form.isAllDay
      ? combineDateTime(form.endDate, "23:59")
      : combineDateTime(form.endDate, form.endTime);

    if (end <= start) {
      toast.error("O período precisa ser válido antes de verificar a disponibilidade");
      return;
    }

    try {
      setCheckingFreebusy(true);
      setFreebusyStatus(null);
      const items = [{ id: form.googleCalendarId }];
      selectedAttendees.forEach(email => items.push({ id: email }));
      
      const freebusy = await checkGoogleFreeBusy(start.toISOString(), end.toISOString(), items);
      
      let isBusy = false;
      Object.keys(freebusy).forEach(id => {
        if (freebusy[id].busy && freebusy[id].busy.length > 0) {
          isBusy = true;
        }
      });
      
      setFreebusyStatus(isBusy ? "busy" : "free");
      if (isBusy) {
        toast.warning("Atenção: Existem conflitos de horário neste período.");
      } else {
        toast.success("O horário está livre para todos.");
      }
    } catch (err) {
      toast.error("Erro ao checar disponibilidade.");
    } finally {
      setCheckingFreebusy(false);
    }
  };

  /**
   * Validação e Submissão para API

   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      toast.error("Informe um título para o evento");
      return;
    }

    const start = form.isAllDay
      ? combineDateTime(form.startDate, "00:00")
      : combineDateTime(form.startDate, form.startTime);

    const end = form.isAllDay
      ? combineDateTime(form.endDate, "23:59")
      : combineDateTime(form.endDate, form.endTime);

    if (end <= start) {
      toast.error("O término deve ser após o início");
      return;
    }

    const attendees = mergeUniqueEmails(
      selectedAttendees,
      parseAttendeesInput(form.attendeesQuery)
    );
    if (attendees.some((email) => !EMAIL_REGEX.test(email))) {
      toast.error("Alguns e-mails de convidados são inválidos");
      return;
    }

    try {
      setIsSaving(true);
      
      const payload = {
        title,
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: form.isAllDay,
        sync_with_google: form.syncWithGoogle,
        create_google_meet: form.syncWithGoogle && form.createMeetLink,
        attendees: form.syncWithGoogle ? attendees : [],
        google_calendar_id: form.syncWithGoogle ? form.googleCalendarId : undefined,
      };

      let result;
      if (eventToEdit?.id && eventToEdit.source === "internal") {
        result = await updateEvent(eventToEdit.id, payload);
        toast.success("Evento atualizado com sucesso");
      } else {
        result = await createEvent(payload);
        toast.success("Evento criado com sucesso");
      }
      
      onCreated?.(result);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro interno no servidor.";
      toast.error(message || `Não foi possível ${eventToEdit ? 'atualizar' : 'criar'} o evento`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="animate-in fade-in absolute inset-0 bg-neutral-900/40 backdrop-blur-[1px] transition-opacity duration-200"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />

      {/* Modal Container: Padronizado com rounded-md e max-w-lg para design compacto */}
      <div className="animate-in zoom-in-95 fade-in relative w-full max-w-lg rounded-md bg-white shadow-xl ring-1 ring-neutral-200 duration-200 dark:bg-neutral-900 dark:ring-neutral-800">
        {/* Botão de Fechar */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            disabled={isSaving}
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
          {/* Header do Formulário (Título) */}
          <div className="shrink-0 border-b border-transparent px-5 pt-5 pb-3">
            <input
              type="text"
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder="Adicionar título"
              className="w-full bg-transparent text-lg font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100 dark:placeholder:text-neutral-600"
              maxLength={255}
              disabled={isSaving}
              autoFocus
              required
            />
          </div>

          <div className="custom-scrollbar mt-2 flex-1 space-y-4 overflow-y-auto px-5 pb-5">
            {/* Bloco Unificado de Data e Hora - Compacto */}
            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-800/30">
              {/* Toggle Dia Inteiro */}
              <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  <Clock size={14} className="text-neutral-500" />
                  Dia inteiro
                </div>
                <Toggle
                  checked={form.isAllDay}
                  onChange={(v) => handleChange("isAllDay", v)}
                  disabled={isSaving}
                />
              </div>

              <div className="mx-2 my-1.5 h-px bg-neutral-200 dark:bg-neutral-700/60" />

              {/* Data/Hora de Início */}
              <div className="flex items-center justify-between gap-3 px-2 py-1">
                <span className="w-12 text-xs text-neutral-500 dark:text-neutral-400">Início</span>
                <div className="flex flex-1 justify-end gap-2">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => handleStartChange("startDate", event.target.value)}
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 transition-colors focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                    disabled={isSaving}
                    required
                  />
                  {!form.isAllDay && (
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(event) => handleStartChange("startTime", event.target.value)}
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 transition-colors focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                      disabled={isSaving}
                      required
                    />
                  )}
                </div>
              </div>

              {/* Data/Hora de Término */}
              <div className="flex items-center justify-between gap-3 px-2 py-1">
                <span className="w-12 text-xs text-neutral-500 dark:text-neutral-400">Fim</span>
                <div className="flex flex-1 justify-end gap-2">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => handleEndChange("endDate", event.target.value)}
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 transition-colors focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                    disabled={isSaving}
                    required
                  />
                  {!form.isAllDay && (
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={(event) => handleEndChange("endTime", event.target.value)}
                      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 transition-colors focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                      disabled={isSaving}
                      required
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Integração Google (Progressive Disclosure) */}
            <div className="flex flex-col rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-800/30">
              {/* Header de Integração */}
              <div className="flex items-center justify-between p-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                    <GoogleLogoIcon />
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                      Conectar evento com <span className="text-brand-primary-700">Google Calendar</span> |{" "}
                      <span className="text-brand-primary-700">Meet</span>
                    </h3>
                    {!googleConnected && (
                      <button
                        type="button"
                        onClick={connectGoogleCalendar}
                        className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Conectar conta &rarr;
                      </button>
                    )}
                  </div>
                </div>
                <Toggle
                  checked={form.syncWithGoogle}
                  onChange={(v) => handleChange("syncWithGoogle", v)}
                  disabled={isSaving || !googleConnected}
                />
              </div>

              {/* Sub-card do Google Meet e Convidados (Animação Sanfona) */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  form.syncWithGoogle
                    ? "mt-2 grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                {/* CORREÇÃO AQUI: 
                  Classe dinâmica que permite 'overflow-visible' se o usuário estiver 
                  pesquisando ou se houver resultados. Isso deixa o Dropdown "vazar".
                */}
                <div
                  className={
                    isSearchingAttendees || attendeeResults.length > 0
                      ? "overflow-visible"
                      : "overflow-hidden"
                  }
                >
                  <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-white p-2.5 shadow-sm dark:border-neutral-700/60 dark:bg-neutral-900">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg" className="text-neutral-500">
                          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" fill="currentColor"/>
                        </svg>
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Calendário Base
                        </span>
                      </div>
                      <select
                        value={form.googleCalendarId}
                        onChange={(e) => handleChange("googleCalendarId", e.target.value)}
                        disabled={isSaving || !googleConnected || availableCalendars.length === 0}
                        className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-800 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:focus:bg-neutral-900"
                      >
                        {availableCalendars.length === 0 ? (
                          <option value="primary">Carregando calendários...</option>
                        ) : (
                          availableCalendars.map((cal) => (
                            <option key={cal.id} value={cal.id} title={cal.summary}>
                              {cal.summary.length > 30 ? cal.summary.substring(0, 30) + '...' : cal.summary}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="my-0.5 h-px bg-neutral-100 dark:bg-neutral-800" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video size={14} className="text-emerald-600 dark:text-emerald-500" />
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          Google Meet
                        </span>
                      </div>
                      <Toggle
                        checked={form.createMeetLink}
                        onChange={(v) => handleChange("createMeetLink", v)}
                        disabled={isSaving || !googleConnected}
                      />
                    </div>

                    <div className="my-0.5 h-px bg-neutral-100 dark:bg-neutral-800" />

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-blue-600 dark:text-blue-500" />
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Convidados
                          </span>
                        </div>
                        {selectedAttendees.length > 0 && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            {selectedAttendees.length} adicionado(s)
                          </span>
                        )}
                      </div>

                      {/* Faux Input (Container que imita um input mas engloba as tags e o campo real) */}
                      <div className="relative">
                        <div
                          className={`flex min-h-[34px] w-full flex-wrap items-center gap-1.5 rounded-md border bg-neutral-50 px-2 py-1.5 transition-colors dark:bg-neutral-950 ${
                            isSaving || !googleConnected
                              ? "border-neutral-200 opacity-50 dark:border-neutral-800"
                              : "border-neutral-300 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 dark:border-neutral-700 dark:focus-within:bg-neutral-900"
                          }`}
                        >
                          {/* Pills de usuários selecionados */}
                          {selectedAttendees.map((email) => (
                            <span
                              key={email}
                              className="group flex max-w-full items-center gap-1 rounded bg-blue-100/60 py-0.5 pr-1 pl-2 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-200/60 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                            >
                              <span className="max-w-[140px] truncate sm:max-w-[200px]">
                                {email}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAttendee(email)}
                                className="flex h-3.5 w-3.5 items-center justify-center rounded-sm text-blue-500 transition-colors hover:bg-blue-300 hover:text-blue-800 dark:text-blue-400 dark:hover:bg-blue-800 dark:hover:text-blue-200"
                                aria-label={`Remover ${email}`}
                              >
                                <X size={10} />
                              </button>
                            </span>
                          ))}

                          {/* Input Real (Transparente e flexível) */}
                          <input
                            type="text"
                            value={form.attendeesQuery}
                            onChange={(event) => handleChange("attendeesQuery", event.target.value)}
                            onKeyDown={handleAttendeesKeyDown}
                            placeholder={
                              selectedAttendees.length === 0
                                ? "Pesquise ou adicione com Enter"
                                : "Adicionar mais..."
                            }
                            className="min-w-[120px] flex-1 bg-transparent text-xs text-neutral-700 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200"
                            disabled={isSaving || !googleConnected}
                          />
                        </div>

                        {/* Dropdown de Resultados com z-[100] garantido */}
                        {(isSearchingAttendees || attendeeResults.length > 0) && (
                          <div className="animate-in fade-in zoom-in-95 slide-in-from-top-1 custom-scrollbar absolute top-full left-0 z-[100] mt-1.5 max-h-48 w-full overflow-y-auto rounded-md border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                            {isSearchingAttendees ? (
                              <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-neutral-500">
                                <Loader2 size={12} className="animate-spin text-blue-500" />{" "}
                                Buscando usuários...
                              </div>
                            ) : (
                              attendeeResults.map((user) => (
                                <button
                                  key={`${user.id}-${user.email}`}
                                  type="button"
                                  onClick={() => addAttendee(user.email)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                                      {user.name || user.username || "Usuário"}
                                    </span>
                                    <span className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                                      {user.email}
                                    </span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                        Dica: Insira e-mails externos e pressione <strong>Enter</strong>. Convites
                        serão disparados via Google.
                      </p>

                      {form.syncWithGoogle && (
                        <div className="mt-2 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={handleCheckFreebusy}
                            disabled={isSaving || checkingFreebusy || selectedAttendees.length === 0}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                          >
                            {checkingFreebusy ? "Verificando..." : "Verificar Disponibilidade"}
                          </button>
                          
                          {freebusyStatus === "free" && (
                            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                              <span className="flex-shrink-0">✓</span> Todos disponíveis neste horário
                            </div>
                          )}
                          
                          {freebusyStatus === "busy" && (
                            <div className="flex items-center gap-1.5 rounded-md bg-orange-50 px-2 py-1.5 text-[11px] font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                              <span className="flex-shrink-0">⚠</span> Há conflito de horários (ou não têm permissão para ver)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Localização e Descrição (Ghost Inputs com Ícones) */}
            <div className="space-y-3 px-1 pt-1">
              <div className="flex items-center gap-2.5">
                <MapPin size={16} className="shrink-0 text-neutral-400" />
                <input
                  type="text"
                  value={form.location}
                  onChange={(event) => handleChange("location", event.target.value)}
                  placeholder="Adicionar local"
                  className="w-full bg-transparent text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200"
                  maxLength={500}
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-start gap-2.5">
                <AlignLeft size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="Adicionar descrição"
                  className="min-h-[50px] w-full resize-none bg-transparent text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-200"
                  maxLength={2000}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Call-to-action (Footer Padrão) */}
          <div className="flex shrink-0 items-center justify-end gap-2 rounded-b-md border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-w-[90px] items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-neutral-800 hover:shadow disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isSaving ? <Loader2 size={12} className="animate-spin" /> : null}
              {isSaving ? "Salvando" : eventToEdit ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
