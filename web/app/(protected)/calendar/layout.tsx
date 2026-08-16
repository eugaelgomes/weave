"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { CalendarDays, ChevronRight, Clock3, Info } from "lucide-react";
import { CalendarHeader } from "@/app/(protected)/_components/ui/headers/calendar-header";
import { MicroCalendar } from "@/app/(protected)/calendar/_components/micro-calendar";
import { CalendarPageViewProvider } from "@/app/(protected)/calendar/_contexts/calendar-page-view-context";
import { NotesProvider } from "@/app/_contexts/notes-context";
import { SidebarSectionHeader } from "@/app/(protected)/_components/ui/sidebar-section-header";

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const base = pathname.replace(/\/+$/, "");
  const params = useParams();
  
  const isCalendarHome = base === `/calendar`;

  return (
    <CalendarPageViewProvider>
      <div className="flex h-full flex-col gap-2">
        <CalendarHeader />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:gap-2">
          <div className="[&::-webkit-scrollbar-thumb]:bg-brand-primary-500/40 hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-500 dark:[&::-webkit-scrollbar-thumb]:bg-brand-primary-500/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-500/60 dark:shadow-surface-dark-sm dark:border-surface-dark-border w-full max-w-[180px] flex-shrink-0 overflow-y-auto border-b border-neutral-200 bg-neutral-50 md:w-[220px] md:rounded-md md:border md:bg-white md:shadow-sm dark:bg-[#1d1d1b]/30 dark:md:border-neutral-800 dark:md:bg-neutral-900/50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="space-y-4 p-2">
              <div>
                <SidebarSectionHeader title="Menu" />

                <ul className="space-y-0.5">
                  <li>
                    <Link
                      href={`/calendar`}
                      className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                        isCalendarHome
                          ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <CalendarDays
                          className={`h-3.5 w-3.5 flex-shrink-0 ${
                            isCalendarHome ? "text-brand-primary-500" : "text-neutral-400"
                          }`}
                        />
                        <span className="truncate">Visão geral</span>
                      </div>
                      {isCalendarHome && <ChevronRight className="h-3 w-3 text-neutral-400" />}
                    </Link>
                  </li>
                </ul>
              </div>

              <MicroCalendar />

              <div>
                <SidebarSectionHeader title="Legenda" />

                <div className="dark:border-surface-dark-border space-y-1.5 rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
                  <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span>Google Calendar</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    <span>Tarefas</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                    <span>Projetos</span>
                  </div>
                </div>
              </div>

              <div>
                <SidebarSectionHeader title="Dicas" />

                <div className="dark:border-surface-dark-border space-y-1 rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
                  <p className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <Clock3 className="h-3 w-3 flex-shrink-0" />
                    Use o topo para alternar dia, semana, mês e ano.
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    Clique em um dia para abrir os detalhes laterais.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="dark:shadow-surface-dark-sm md:dark:border-surface-dark-border flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-[#1d1d1b]">
            {children}
          </div>
        </div>
      </div>
    </CalendarPageViewProvider>
  );
}
