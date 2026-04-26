"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/app/_contexts/auth-context";
import { useCalendar } from "@/app/_contexts/calendar-context";
import type { FreeBusyResponse } from "@/app/_services/calendar-service/calendar-service";
import { searchUsers, type User as SearchUser } from "@/app/_services/notes-service/notes-service";
import type { UserPreferences } from "@/types/user-preferences";
import { calendarUtils } from "@/app/_utils/calendar";
import { useCalendarPageView } from "../_contexts/calendar-page-view-context";

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const WEEK_LETTERS_PT = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEK_LETTERS_EN = ["S", "M", "T", "W", "T", "F", "S"];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const startEndOfLocalDay = (d: Date): { start: Date; end: Date } => {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { start, end };
};

const pickFreeBusyForEmail = (data: FreeBusyResponse, email: string) => {
  const norm = normalizeEmail(email);
  for (const [key, val] of Object.entries(data)) {
    if (key.toLowerCase() === norm && val?.busy) return val.busy;
  }
  return null;
};

function MicroCalendarPeopleFreeBusy({
  locale,
  isPt,
  currentDate,
}: {
  locale: string;
  isPt: boolean;
  currentDate: Date;
}) {
  const { googleConnected, checkGoogleFreeBusy, connectGoogleCalendar } = useCalendar();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickedEmail, setPickedEmail] = useState<string | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<{ start: string; end: string }[]>([]);
  const [loadingFb, setLoadingFb] = useState(false);

  const peoplePlaceholder = isPt ? "Pesquisar pessoas" : "Search people";
  const connectHint = isPt
    ? "Conecte o Google Calendar para ver a disponibilidade de outras pessoas."
    : "Connect Google Calendar to see others’ availability.";
  const agendaLabel = isPt ? "Indisponível neste dia" : "Busy on this day";
  const freeLabel = isPt ? "Sem bloqueios visíveis neste dia." : "No busy blocks on this day.";
  const connectBtn = isPt ? "Conectar Google" : "Connect Google";

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    const term = query.trim();
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const users = await searchUsers(term);
        const dedup = new Map<string, SearchUser>();
        users.forEach((u) => {
          if (!u.email) return;
          const key = normalizeEmail(u.email);
          if (!dedup.has(key)) dedup.set(key, u);
        });
        setResults(Array.from(dedup.values()).slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query]);

  const loadFreeBusy = useCallback(async () => {
    if (!googleConnected || !pickedEmail) {
      setBusySlots([]);
      return;
    }

    const { start, end } = startEndOfLocalDay(currentDate);

    try {
      setLoadingFb(true);
      const data = await checkGoogleFreeBusy(start.toISOString(), end.toISOString(), [
        { id: pickedEmail },
      ]);
      const busy = pickFreeBusyForEmail(data, pickedEmail);
      setBusySlots(busy ?? []);
    } catch {
      setBusySlots([]);
      toast.error(
        isPt
          ? "Não foi possível consultar a agenda desta pessoa."
          : "Could not load this person’s calendar."
      );
    } finally {
      setLoadingFb(false);
    }
  }, [googleConnected, pickedEmail, currentDate, checkGoogleFreeBusy, isPt]);

  useEffect(() => {
    if (!pickedEmail || !googleConnected) {
      setBusySlots([]);
      return;
    }
    loadFreeBusy();
  }, [pickedEmail, googleConnected, loadFreeBusy]);

  const selectUser = (u: SearchUser) => {
    if (!u.email) return;
    setPickedEmail(u.email);
    setPickedName(u.name || u.username || u.email);
    setQuery("");
    setResults([]);
  };

  const clearPicked = () => {
    setPickedEmail(null);
    setPickedName(null);
    setBusySlots([]);
  };

  const formatRange = (startIso: string, endIso: string) => {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
    return `${s.toLocaleTimeString(locale, opts)} – ${e.toLocaleTimeString(locale, opts)}`;
  };

  return (
    <div className="relative mt-2">
      <div className="flex w-full items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-700 dark:bg-neutral-900/60">
        <Users className="h-3.5 w-3.5 shrink-0 text-neutral-500 dark:text-neutral-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={peoplePlaceholder}
          className="min-w-0 flex-1 bg-transparent text-[10px] text-neutral-800 outline-none placeholder:text-neutral-500 dark:text-neutral-200 dark:placeholder:text-neutral-500"
          autoComplete="off"
          aria-label={peoplePlaceholder}
        />
        {searching ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-neutral-400" />
        ) : null}
      </div>

      {query.trim().length >= 3 && results.length > 0 ? (
        <ul className="absolute right-0 left-0 z-30 mt-0.5 max-h-32 overflow-y-auto rounded-md border border-neutral-200 bg-white py-0.5 shadow-md dark:border-neutral-700 dark:bg-neutral-900">
          {results.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="flex w-full flex-col items-start gap-0 px-2 py-1 text-left text-[10px] hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(u)}
              >
                <span className="truncate font-medium text-neutral-800 dark:text-neutral-100">
                  {u.name || u.username}
                </span>
                <span className="truncate text-neutral-500 dark:text-neutral-400">{u.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {pickedEmail && pickedName ? (
        <div className="mt-2 space-y-1.5 rounded-md border border-neutral-200 bg-white/90 p-2 dark:border-neutral-700 dark:bg-neutral-900/70">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold text-neutral-800 dark:text-neutral-100">
                {pickedName}
              </p>
              <p className="truncate text-[9px] text-neutral-500 dark:text-neutral-400">
                {pickedEmail}
              </p>
            </div>
            <button
              type="button"
              aria-label={isPt ? "Remover" : "Remove"}
              onClick={clearPicked}
              className="shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {!googleConnected ? (
            <div className="space-y-1.5">
              <p className="text-[9px] leading-snug text-neutral-500 dark:text-neutral-400">
                {connectHint}
              </p>
              <button
                type="button"
                onClick={connectGoogleCalendar}
                className="w-full rounded border border-blue-200 bg-blue-50 py-1 text-[9px] font-semibold text-blue-800 dark:border-blue-800/60 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {connectBtn}
              </button>
            </div>
          ) : loadingFb ? (
            <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 dark:text-neutral-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isPt ? "Consultando…" : "Checking…"}
            </div>
          ) : (
            <>
              <p className="text-[9px] font-medium text-neutral-600 dark:text-neutral-300">
                {agendaLabel}
              </p>
              {busySlots.length === 0 ? (
                <p className="text-[9px] text-emerald-700 dark:text-emerald-400/90">{freeLabel}</p>
              ) : (
                <ul className="max-h-24 space-y-0.5 overflow-y-auto text-[9px] text-neutral-700 dark:text-neutral-300">
                  {busySlots.map((slot, i) => (
                    <li
                      key={`${slot.start}-${i}`}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800/80"
                    >
                      {formatRange(slot.start, slot.end)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MicroCalendar() {
  const { user } = useAuth();
  const { currentDate, setCurrentDate, selectedDate, setSelectedDate } = useCalendarPageView();

  const locale = ((user?.usage_preference as UserPreferences) || {}).language?.interface || "pt-BR";
  const isPt = locale.startsWith("pt");
  const monthNames = isPt ? calendarUtils.months.pt : calendarUtils.months.en;
  const weekLetters = isPt ? WEEK_LETTERS_PT : WEEK_LETTERS_EN;

  const [panelYear, setPanelYear] = useState(() => currentDate.getFullYear());
  const [panelMonth, setPanelMonth] = useState(() => currentDate.getMonth());

  useEffect(() => {
    setPanelYear(currentDate.getFullYear());
    setPanelMonth(currentDate.getMonth());
  }, [currentDate]);

  const headerLabel = useMemo(() => {
    if (isPt) return `${monthNames[panelMonth]} de ${panelYear}`;
    return `${monthNames[panelMonth]} ${panelYear}`;
  }, [isPt, monthNames, panelMonth, panelYear]);

  const highlightDate = selectedDate ?? currentDate;

  const cells = useMemo(() => {
    const first = new Date(panelYear, panelMonth, 1);
    const lead = first.getDay();
    const start = new Date(panelYear, panelMonth, 1 - lead);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [panelYear, panelMonth]);

  const shiftMonth = (delta: number) => {
    const d = new Date(panelYear, panelMonth + delta, 1);
    setPanelYear(d.getFullYear());
    setPanelMonth(d.getMonth());
  };

  const onPickDay = (d: Date) => {
    const next = new Date(d);
    next.setHours(12, 0, 0, 0);
    setCurrentDate(next);
    setSelectedDate(next);
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-100/80 p-2 dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-medium text-neutral-800 dark:text-neutral-100">
          {headerLabel}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label={isPt ? "Mês anterior" : "Previous month"}
            onClick={() => shiftMonth(-1)}
            className="rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={isPt ? "Próximo mês" : "Next month"}
            onClick={() => shiftMonth(1)}
            className="rounded p-0.5 text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-y-0.5 text-center">
        {weekLetters.map((letter, i) => (
          <div
            key={`w-${i}`}
            className="text-[9px] font-semibold text-neutral-500 dark:text-neutral-500"
          >
            {letter}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {cells.map((cellDate, idx) => {
          const inMonth = cellDate.getMonth() === panelMonth;
          const selected = isSameDay(cellDate, highlightDate);
          const dim = !inMonth;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onPickDay(cellDate)}
              className={`flex h-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors ${
                dim
                  ? "text-neutral-400 dark:text-neutral-600"
                  : "text-neutral-800 dark:text-neutral-200"
              } ${selected ? "bg-sky-400 text-neutral-900 shadow-sm dark:bg-sky-400 dark:text-neutral-950" : "hover:bg-neutral-200/70 dark:hover:bg-neutral-800/80"}`}
            >
              {cellDate.getDate()}
            </button>
          );
        })}
      </div>

      <MicroCalendarPeopleFreeBusy locale={locale} isPt={isPt} currentDate={currentDate} />
    </div>
  );
}
