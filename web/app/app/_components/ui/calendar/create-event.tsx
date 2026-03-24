"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createInternalCalendarEvent,
  connectGoogleCalendar,
  type InternalCalendarEvent,
} from "@/app/_services/calendar-service/calendar-service";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (event: InternalCalendarEvent) => void;
  defaultDate?: Date | null;
  locale?: string;
  googleConnected?: boolean;
}

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
}

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

const initialState = (baseDate?: Date | null): FormState => {
  const now = baseDate ? new Date(baseDate) : new Date();
  now.setSeconds(0, 0);

  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

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
  };
};

const combineDateTime = (date: string, time: string): Date => {
  return new Date(`${date}T${time}:00`);
};

export default function CreateEventModal({
  isOpen,
  onClose,
  onCreated,
  defaultDate,
  locale = "pt-BR",
  googleConnected = false,
}: CreateEventModalProps) {
  const [form, setForm] = useState<FormState>(() => initialState(defaultDate));
  const [isSaving, setIsSaving] = useState(false);

  const texts = useMemo(() => {
    const isPt = locale.startsWith("pt");
    return {
      title: isPt ? "Novo evento" : "New event",
      subtitle: isPt
        ? "Crie um compromisso, tarefa ou prazo"
        : "Create an appointment, task, or deadline",
      eventTitle: isPt ? "Titulo" : "Title",
      description: isPt ? "Descricao" : "Description",
      location: isPt ? "Local" : "Location",
      startsAt: isPt ? "Inicio" : "Starts at",
      endsAt: isPt ? "Fim" : "Ends at",
      allDay: isPt ? "Dia inteiro" : "All day",
      syncGoogle: isPt ? "Sincronizar com Google Calendar" : "Sync with Google Calendar",
      syncGoogleHelpConnected: isPt
        ? "O evento sera criado tambem no seu Google Calendar."
        : "The event will also be created in your Google Calendar.",
      syncGoogleHelpDisconnected: isPt
        ? "Conecte sua conta Google para habilitar a sincronizacao."
        : "Connect your Google account to enable sync.",
      connectGoogle: isPt ? "Conectar Google" : "Connect Google",
      cancel: isPt ? "Cancelar" : "Cancel",
      save: isPt ? "Salvar evento" : "Save event",
      saving: isPt ? "Salvando..." : "Saving...",
      titleRequired: isPt ? "Informe um titulo para o evento" : "Enter an event title",
      invalidRange: isPt
        ? "A data/hora de fim deve ser maior que a de inicio"
        : "End date/time must be after start date/time",
      created: isPt ? "Evento criado com sucesso" : "Event created successfully",
      createError: isPt ? "Nao foi possivel criar o evento" : "Could not create event",
    };
  }, [locale]);

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialState(defaultDate));
  }, [isOpen, defaultDate]);

  useEffect(() => {
    if (!isOpen) return;

    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = form.title.trim();
    if (!title) {
      toast.error(texts.titleRequired);
      return;
    }

    const start = form.isAllDay
      ? combineDateTime(form.startDate, "00:00")
      : combineDateTime(form.startDate, form.startTime);

    const end = form.isAllDay
      ? combineDateTime(form.endDate, "23:59")
      : combineDateTime(form.endDate, form.endTime);

    if (end <= start) {
      toast.error(texts.invalidRange);
      return;
    }

    try {
      setIsSaving(true);

      const created = await createInternalCalendarEvent({
        title,
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: form.isAllDay,
        sync_with_google: form.syncWithGoogle,
      });

      toast.success(texts.created);
      onCreated?.(created);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : texts.createError;
      toast.error(message || texts.createError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => !isSaving && onClose()}
      />

      <div className="relative w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-yellow-100 p-2 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              <CalendarPlus size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 sm:text-base">
                {texts.title}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {texts.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => !isSaving && onClose()}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            disabled={isSaving}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {texts.eventTitle}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              placeholder={texts.eventTitle}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-yellow-500 dark:border-neutral-700 dark:bg-neutral-900"
              maxLength={255}
              disabled={isSaving}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {texts.startsAt}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) => handleChange("startDate", event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs outline-none transition-colors focus:border-yellow-500 dark:border-neutral-700 dark:bg-neutral-900"
                  disabled={isSaving}
                  required
                />
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => handleChange("startTime", event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs outline-none transition-colors focus:border-yellow-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
                  disabled={isSaving || form.isAllDay}
                  required={!form.isAllDay}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                {texts.endsAt}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) => handleChange("endDate", event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs outline-none transition-colors focus:border-yellow-500 dark:border-neutral-700 dark:bg-neutral-900"
                  disabled={isSaving}
                  required
                />
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => handleChange("endTime", event.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-xs outline-none transition-colors focus:border-yellow-500 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900"
                  disabled={isSaving || form.isAllDay}
                  required={!form.isAllDay}
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={form.isAllDay}
              onChange={(event) => handleChange("isAllDay", event.target.checked)}
              disabled={isSaving}
              className="h-3.5 w-3.5 rounded border-neutral-300 text-yellow-600 focus:ring-yellow-500"
            />
            {texts.allDay}
          </label>

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/50">
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.syncWithGoogle}
                onChange={(event) => handleChange("syncWithGoogle", event.target.checked)}
                disabled={isSaving || !googleConnected}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-yellow-600 focus:ring-yellow-500 disabled:opacity-50"
              />
              {texts.syncGoogle}
            </label>

            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {googleConnected ? texts.syncGoogleHelpConnected : texts.syncGoogleHelpDisconnected}
              </p>
              {!googleConnected && (
                <button
                  type="button"
                  onClick={connectGoogleCalendar}
                  className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40"
                >
                  {texts.connectGoogle}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {texts.location}
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(event) => handleChange("location", event.target.value)}
              placeholder={texts.location}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-yellow-500 dark:border-neutral-700 dark:bg-neutral-900"
              maxLength={500}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              {texts.description}
            </label>
            <textarea
              value={form.description}
              onChange={(event) => handleChange("description", event.target.value)}
              placeholder={texts.description}
              className="min-h-[90px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-yellow-500 dark:border-neutral-700 dark:bg-neutral-900"
              maxLength={2000}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              {texts.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
              {isSaving ? texts.saving : texts.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
