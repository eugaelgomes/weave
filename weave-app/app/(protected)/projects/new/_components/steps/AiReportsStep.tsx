"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, BarChart3, Loader2, Sparkles } from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";
import type { CreateProjectWizardStepProps } from "@/app/(protected)/projects/new/_components/create-project-wizard.types";

export function AiReportsStep({ state, actions }: CreateProjectWizardStepProps) {
  const { updateAiReportConfig } = useProjects();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!state.created.projectId) {
    return (
      <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
        <div className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-200">
          <AlertCircle className="mt-0.5 h-4 w-4 text-neutral-400" aria-hidden />
          Crie o projeto no passo “Básico” para configurar relatórios.
        </div>
      </section>
    );
  }

  const projectId = state.created.projectId;

  const channels = useMemo(() => {
    const list = state.draft.reportForm.channels ?? [];
    return list.length ? list : (["in_app"] as ("in_app" | "email")[]);
  }, [state.draft.reportForm.channels]);

  const onApplyAndContinue = async () => {
    if (!projectId) return;
    setLocalError(null);

    if (!state.draft.configureReports) {
      actions.goToStep("review");
      return;
    }

    actions.setSetupStatus("ai_reports", "running");
    setBusy(true);
    try {
      const ok = await updateAiReportConfig(projectId, { ...state.draft.reportForm, channels });
      if (!ok) {
        actions.setSetupStatus("ai_reports", "error", "Não foi possível ativar relatórios.");
        setLocalError(
          "Não foi possível ativar relatórios. Você pode configurar mais tarde no projeto."
        );
        actions.goToStep("review");
        return;
      }
      actions.setSetupStatus("ai_reports", "done");
      actions.goToStep("review");
    } catch (err: unknown) {
      console.error(err);
      actions.setSetupStatus(
        "ai_reports",
        "error",
        "Falhou ao aplicar relatórios. Pode configurar mais tarde no projeto."
      );
      setLocalError("Falhou ao aplicar relatórios. Você pode configurar mais tarde no projeto.");
      actions.goToStep("review");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
      <div className="mb-2 flex items-start gap-2">
        <BarChart3 className="mt-0.5 h-4 w-4 text-neutral-400" aria-hidden />
        <div className="flex-1">
          <h2 className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
            Relatórios &amp; lembretes
          </h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
            Opcional: configure relatórios e canais. Se algo falhar, você pode ajustar mais tarde.
          </p>
        </div>
      </div>

      {localError ? (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {localError}
        </div>
      ) : null}

      <div className="mt-3">
        <label className="dark:border-surface-dark-border-strong flex cursor-pointer items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={state.draft.configureReports}
            onChange={(e) => actions.setConfigureReports(e.target.checked)}
            className="text-brand-primary-500 focus:ring-brand-primary-500/30 rounded-md border-neutral-300"
          />
          Ativar relatórios
        </label>
      </div>

      {state.draft.configureReports ? (
        <div className="dark:border-surface-dark-border mt-3 grid grid-cols-1 gap-2 border-t border-neutral-100 pt-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Hora (UTC)
            </label>
            <input
              type="text"
              value={state.draft.reportForm.report_time_utc ?? "09:00"}
              onChange={(e) => actions.setReportForm({ report_time_utc: e.target.value })}
              placeholder="HH:mm"
              className="dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 font-mono text-sm dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Duração sprint (dias)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={state.draft.reportForm.default_sprint_duration_days ?? 14}
              onChange={(e) =>
                actions.setReportForm({
                  default_sprint_duration_days: Number(e.target.value) || 14,
                })
              }
              className="dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Canais
            </span>
            <div className="flex flex-wrap gap-2">
              {(["in_app", "email"] as const).map((ch) => (
                <label
                  key={ch}
                  className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <input
                    type="checkbox"
                    checked={(state.draft.reportForm.channels ?? []).includes(ch)}
                    onChange={(e) => {
                      const cur = new Set(state.draft.reportForm.channels ?? []);
                      if (e.target.checked) cur.add(ch);
                      else cur.delete(ch);
                      actions.setReportForm({
                        channels: Array.from(cur) as ("in_app" | "email")[],
                      });
                    }}
                    className="text-brand-primary-500 rounded-md border-neutral-300"
                  />
                  {ch === "in_app" ? "Na app" : "Email"}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor="report-recipients"
              className="text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              Destinatários
            </label>
            <select
              id="report-recipients"
              value={state.draft.reportForm.recipient_scope ?? "all_members"}
              onChange={(e) =>
                actions.setReportForm({
                  recipient_scope: e.target.value as "owner_only" | "all_members" | "custom",
                })
              }
              className="dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="owner_only">Apenas dono</option>
              <option value="all_members">Todos os membros</option>
              <option value="custom">Personalizado (avançado)</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            {(
              [
                ["enable_sprint_kickoff", "Kickoff de sprint"],
                ["enable_daily_standup", "Daily standup"],
                ["enable_sprint_review", "Review de sprint"],
                ["auto_create_next_sprint", "Criar próxima sprint automaticamente"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300"
              >
                <input
                  type="checkbox"
                  checked={Boolean(state.draft.reportForm[key])}
                  onChange={(e) =>
                    actions.setReportForm((f) => ({ ...f, [key]: e.target.checked }))
                  }
                  className="text-brand-primary-500 rounded-md border-neutral-300"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="dark:border-surface-dark-border mt-3 flex gap-2 border-t border-neutral-100 pt-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
        <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
          <span className="font-medium text-neutral-600 dark:text-neutral-400">IA no projeto:</span>{" "}
          chat, análises e agentes ficam disponíveis no projeto após criar.
        </p>
      </div>

      <div className="dark:border-surface-dark-border mt-3 flex items-center justify-end gap-2 border-t border-neutral-200 pt-2">
        <button
          type="button"
          onClick={() => actions.goToStep("review")}
          className="rounded-md bg-neutral-900 px-2 py-2 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          Pular
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onApplyAndContinue}
          className="bg-brand-primary-500 inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-bold text-neutral-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Aplicar e continuar
        </button>
      </div>
    </section>
  );
}
