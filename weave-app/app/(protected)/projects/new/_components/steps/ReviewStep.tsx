"use client";

import React, { useMemo } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CreateProjectWizardStepProps } from "../create-project-wizard.types";

function statusLabel(s: string): string {
  switch (s) {
    case "idle":
      return "pendente";
    case "running":
      return "a aplicar…";
    case "done":
      return "ok";
    case "error":
      return "falhou";
    default:
      return s;
  }
}

export function ReviewStep({ state, actions }: CreateProjectWizardStepProps) {
  const router = useRouter();
  const projectId = state.created.projectId;

  const setupRows = useMemo(() => {
    return [
      { key: "icon", label: "Ícone", status: state.setup.statusByStep.icon, error: state.setup.errorByStep.icon },
      { key: "stages", label: "Etapas", status: state.setup.statusByStep.stages, error: state.setup.errorByStep.stages },
      {
        key: "collaborators",
        label: "Colaboradores",
        status: state.setup.statusByStep.collaborators,
        error: state.setup.errorByStep.collaborators,
      },
      {
        key: "ai_reports",
        label: "Relatórios",
        status: state.setup.statusByStep.ai_reports,
        error: state.setup.errorByStep.ai_reports,
      },
    ] as const;
  }, [state.setup.errorByStep, state.setup.statusByStep]);

  return (
    <section className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900/50">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">Revisão</h2>
      <div className="space-y-2 text-sm text-neutral-700 dark:text-neutral-200">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950/30">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">Resumo</div>
          <div className="mt-1 font-semibold text-neutral-900 dark:text-neutral-100">
            {state.draft.basic.title.trim() || "Sem título"}
          </div>
          {state.draft.basic.description.trim() ? (
            <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {state.draft.basic.description.trim()}
            </div>
          ) : null}
          <div className="mt-2 text-xs text-neutral-500">
            {state.draft.basic.methodology} · {state.draft.basic.default_view} · {state.draft.basic.color}
          </div>
        </div>

        {!projectId ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Você ainda não criou o projeto. Volte ao passo “Básico”.
          </div>
        ) : (
          <div className="rounded-md border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-950/30">
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Setup (status)
            </div>
            <ul className="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
              {setupRows.map((r) => (
                <li key={r.key} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-neutral-700 dark:text-neutral-200">
                    {r.label}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">{statusLabel(r.status)}</span>
                  {r.error ? (
                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 sm:ml-2">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                      {r.error}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 pt-2 dark:border-neutral-800">
        <button
          type="button"
          onClick={actions.resetAll}
          className="rounded-md px-2 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Criar outro
        </button>
        <button
          type="button"
          disabled={!projectId}
          onClick={() => router.push(`/projects/${projectId}`)}
          className="inline-flex items-center gap-2 rounded-md bg-brand-primary-500 px-2 py-2 text-sm font-bold text-neutral-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Abrir projeto
        </button>
      </div>
    </section>
  );
}

