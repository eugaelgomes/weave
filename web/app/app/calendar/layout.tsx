"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronRight, Clock3, Info } from "lucide-react";
import { CalendarHeader } from "../_components/ui/headers/calendar-header";

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCalendarHome = pathname === "/app/calendar";

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-2">
      <CalendarHeader />

      {/* Layout Flexbox com Gap (Desktop) */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:gap-2">
        
        {/* SIDEBAR LATERAL — Painel autônomo no desktop, empilhado no mobile */}
        <div className="[&::-webkit-scrollbar-thumb]:bg-brand-primary-500/40 max-w-[180px] hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-500 dark:[&::-webkit-scrollbar-thumb]:bg-brand-primary-500/30 dark:hover:[&::-webkit-scrollbar-thumb]:bg-brand-primary-500/60 w-full flex-shrink-0 overflow-y-auto border-b border-neutral-200 bg-neutral-50 md:w-[220px] md:rounded-md md:border md:bg-white md:shadow-sm dark:border-neutral-800 dark:bg-neutral-900/30 dark:md:border-neutral-800 dark:md:bg-neutral-900/50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="space-y-4 p-2.5">
            <div>
              <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                Menu
              </h2>

              <ul className="space-y-0.5">
                <li>
                  <Link
                    href="/app/calendar"
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

            <div>
              <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                Legenda
              </h2>

              <div className="space-y-1.5 rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950/50">
                <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span>Google Calendar</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <span className="h-2 w-2 rounded-full bg-yellow-400" />
                  <span>Notas</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  <span>Projetos</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                Dicas
              </h2>

              <div className="space-y-1 rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950/50">
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

        {/* CONTEÚDO PRINCIPAL (Calendário) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-neutral-950 md:dark:border-neutral-800">
          {children}
        </div>
      </div>
    </div>
  );
}