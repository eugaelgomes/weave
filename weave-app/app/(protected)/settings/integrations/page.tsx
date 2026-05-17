"use client";

import React from "react";
import { Plug } from "lucide-react";
import { useCalendar } from "@/app/_contexts/calendar-context";
import Image from "next/image";

// Importações diretas das logomarcas (Ajuste o caminho conforme a estrutura do seu projeto)
import GoogleCalendarLogo from "@/app/_assets/google_logo.svg";
import OutlookLogo from "@/app/_assets/microsoft_office_outlook_mail.svg";
import SlackLogo from "@/app/_assets/slack_salesforce_logo.png";
import { SettingsPageShell } from "@/app/(protected)/settings/_components/settings-page-shell";

export const IntegrationsSettings: React.FC<any> = () => {
  const { googleConnected, connectGoogleCalendar, disconnectGoogleCalendar } = useCalendar();

  // --- Classes base refinadas para menor espaçamento ---
  const itemCardClass =
    "group flex h-full flex-col gap-3 rounded-md border p-3.5 transition-all duration-200";

  const connectedCardClass =
    "border-emerald-500/30 bg-emerald-50/50 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-900/10";

  const defaultCardClass =
    "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]/40 dark:hover:border-surface-dark-border-strong";

  const disabledCardClass =
    "border-neutral-100 bg-neutral-50/50 opacity-75 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/20";

  // Wrapper da logo reduzido (h-9 w-9)
  const logoWrapClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white p-1.5 shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]";

  return (
    <div className="overflow-hidden rounded-md border border-neutral-200/60 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
      {/* --- Header --- */}
      <div className="flex items-center justify-between border-b border-neutral-100/60 px-4 py-2 dark:border-surface-dark-border">
        <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
          <Plug className="text-brand-primary-500 h-3.5 w-3.5" />
          Integrações e Aplicações
        </h3>
      </div>

      <div className="p-4">
        {/* --- Top Section --- */}
        <div className="mb-4">
          <p className="max-w-2xl text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Conecte o Weave às suas ferramentas favoritas para sincronizar eventos, criar tarefas
            automaticamente e otimizar o seu fluxo de trabalho.
          </p>
        </div>

        {/* --- Grid Responsivo (1 col -> 2 cols -> 3 cols) --- */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Google Calendar */}
          <div
            className={`${itemCardClass} ${googleConnected ? connectedCardClass : defaultCardClass}`}
          >
            <div className="flex items-start gap-3">
              <div className={logoWrapClass}>
                <Image
                  src={GoogleCalendarLogo}
                  alt="Google Calendar"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-[12px] font-bold text-neutral-900 dark:text-neutral-100">
                  Google Calendar
                </h4>
                <p className="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
                  Sincronize a sua agenda do ecossistema Google.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-neutral-100/80 pt-3 dark:border-surface-dark-border">
              {googleConnected ? (
                <>
                  <span className="flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-bold tracking-wider text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"></span>
                    Conectado
                  </span>
                  <button
                    onClick={disconnectGoogleCalendar}
                    className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-bold text-neutral-500 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:hover:border-red-900/50 dark:hover:bg-red-900/10 dark:hover:text-red-400"
                  >
                    Desconectar
                  </button>
                </>
              ) : (
                <button
                  onClick={connectGoogleCalendar}
                  className="bg-brand-primary-500 ml-auto rounded-md px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-yellow-600 active:scale-95"
                >
                  Conectar
                </button>
              )}
            </div>
          </div>

          {/* Outlook */}
          <div className={`${itemCardClass} ${disabledCardClass}`}>
            <div className="flex items-start gap-3">
              <div className={logoWrapClass}>
                <Image
                  src={OutlookLogo}
                  alt="Outlook"
                  className="h-full w-full object-contain opacity-60 grayscale"
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-[12px] font-bold text-neutral-900 dark:text-neutral-100">
                    Outlook
                  </h4>
                  <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-neutral-500 dark:bg-neutral-800">
                    Em breve
                  </span>
                </div>
                <p className="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
                  Sincronize a sua agenda do ecossistema Microsoft.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-end border-t border-neutral-100/80 pt-3 dark:border-surface-dark-border">
              <button
                disabled
                className="cursor-not-allowed rounded-md bg-neutral-100 px-4 py-1.5 text-[11px] font-bold text-neutral-400 dark:bg-[#1d1d1b] dark:text-neutral-600"
              >
                Conectar
              </button>
            </div>
          </div>

          {/* Slack */}
          <div className={`${itemCardClass} ${disabledCardClass}`}>
            <div className="flex items-start gap-3">
              <div className={logoWrapClass}>
                <Image
                  src={SlackLogo}
                  alt="Slack"
                  className="h-full w-full object-contain opacity-60 grayscale"
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-[12px] font-bold text-neutral-900 dark:text-neutral-100">
                    Slack
                  </h4>
                  <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-neutral-500 dark:bg-neutral-800">
                    Em breve
                  </span>
                </div>
                <p className="text-[10px] leading-snug text-neutral-500 dark:text-neutral-400">
                  Receba notificações e crie tarefas via comandos no Slack.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-end border-t border-neutral-100/80 pt-3 dark:border-surface-dark-border">
              <button
                disabled
                className="cursor-not-allowed rounded-md bg-neutral-100 px-4 py-1.5 text-[11px] font-bold text-neutral-400 dark:bg-[#1d1d1b] dark:text-neutral-600"
              >
                Conectar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function IntegrationsPage() {
  return (
    <SettingsPageShell description="Conecte e gerencie integrações da sua conta.">
      <div className="overflow-hidden">
        <div className="p-2">
          <IntegrationsSettings />
        </div>
      </div>
    </SettingsPageShell>
  );
}
