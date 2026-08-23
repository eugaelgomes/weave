"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";
import type { CreateProjectWizardStepProps } from "@/app/(protected)/projects/new/_components/create-project-wizard.types";

type StageDraft = { name: string; color: string };

const METHODOLOGY_STAGE_DEFAULTS: Record<string, Array<StageDraft>> = {
  kanban: [
    { name: "Backlog", color: "#94a3b8" },
    { name: "To Do", color: "#e2e8f0" },
    { name: "Doing", color: "#bfdbfe" },
    { name: "Done", color: "#bbf7d0" },
  ],
  scrum: [
    { name: "Product Backlog", color: "#94a3b8" },
    { name: "Sprint Backlog", color: "#e2e8f0" },
    { name: "In Progress", color: "#bfdbfe" },
    { name: "Review / QA", color: "#fef08a" },
    { name: "Done", color: "#bbf7d0" },
  ],
};

function stageDefaultsFor(methodology: string): StageDraft[] {
  return (METHODOLOGY_STAGE_DEFAULTS[methodology] ?? METHODOLOGY_STAGE_DEFAULTS.kanban).map(
    (s) => ({
      ...s,
    })
  );
}

export function StagesStep({ state, actions }: CreateProjectWizardStepProps) {
  const { getProjectStages, patchProjectStage } = useProjects();
  const projectId = state.created.projectId;
  const [loadingStages, setLoadingStages] = useState(false);
  const [stagesFromApi, setStagesFromApi] = useState<Array<{
    id: string;
    name: string;
    color: string | null;
    position: number;
  }> | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const defaults = useMemo(
    () => stageDefaultsFor(state.draft.basic.methodology ?? "kanban"),
    [state.draft.basic.methodology]
  );

  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    setLoadingStages(true);
    setLocalError(null);
    void (async () => {
      try {
        const list = await getProjectStages(projectId);
        if (!alive) return;
        setStagesFromApi(
          [...list]
            .sort((a, b) => a.position - b.position)
            .map((s) => ({ id: s.id, name: s.name, color: s.color ?? null, position: s.position }))
        );
      } catch (err) {
        console.error(err);
        if (!alive) return;
        setStagesFromApi(null);
        setLocalError("Não foi possível carregar as etapas do projeto.");
      } finally {
        if (alive) setLoadingStages(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [getProjectStages, projectId]);

  if (!state.created.projectId) {
    return (
      <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
        <div className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-200">
          <AlertCircle className="mt-0.5 h-4 w-4 text-neutral-400" aria-hidden />
          Crie o projeto no passo “Básico” para configurar etapas.
        </div>
      </section>
    );
  }

  const moveStage = (index: number, dir: -1 | 1) => {
    actions.setStageDrafts((rows) => {
      const j = index + dir;
      if (j < 0 || j >= rows.length) return rows;
      const next = [...rows];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const onToggleCustomize = (on: boolean) => {
    actions.setCustomizeStages(on);
    if (on) {
      actions.setStageDrafts(state.draft.stageDrafts.length ? state.draft.stageDrafts : defaults);
    }
  };

  const onApplyAndContinue = async () => {
    if (!projectId) return;
    setLocalError(null);

    if (!state.draft.customizeStages || !state.draft.stageDrafts.length) {
      actions.goToStep("collaborators");
      return;
    }

    if (!stagesFromApi?.length) {
      setLocalError("Não foi possível aplicar alterações porque as etapas não carregaram.");
      return;
    }

    actions.setSetupStatus("stages", "running");
    try {
      const sorted = [...stagesFromApi].sort((a, b) => a.position - b.position);
      const n = Math.min(sorted.length, state.draft.stageDrafts.length);
      for (let i = 0; i < n; i++) {
        const apiStage = sorted[i];
        const draft = state.draft.stageDrafts[i];
        const nextName = draft.name.trim() || apiStage.name;
        const nextColor = draft.color?.trim() || apiStage.color || null;

        const changedName = nextName !== apiStage.name;
        const changedColor = (nextColor ?? null) !== (apiStage.color ?? null);

        if (!changedName && !changedColor) continue;
        await patchProjectStage(projectId, apiStage.id, { name: nextName, color: nextColor });
      }
      actions.setSetupStatus("stages", "done");
      actions.goToStep("collaborators");
    } catch (err) {
      console.error(err);
      actions.setSetupStatus(
        "stages",
        "error",
        "Falhou ao aplicar etapas. Pode tentar novamente mais tarde."
      );
      setLocalError("Falhou ao aplicar etapas. Tente novamente.");
    }
  };

  return (
    <section className="dark:border-surface-dark-border rounded-md border border-neutral-200 bg-white p-2 dark:bg-[#1d1d1b]/50">
      <h2 className="mb-2 text-xs font-bold tracking-wider text-neutral-400 uppercase">
        Etapas do quadro
      </h2>
      <p className="text-xs text-neutral-500 dark:text-neutral-500">
        Por omissão usamos as colunas da metodologia. Se quiser, personalize nomes e cores.
      </p>

      {localError ? (
        <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {localError}
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <label className="dark:border-surface-dark-border-strong flex cursor-pointer items-center gap-2 self-start rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={state.draft.customizeStages}
            onChange={(e) => onToggleCustomize(e.target.checked)}
            className="text-brand-primary-500 focus:ring-brand-primary-500/30 rounded-md border-neutral-300"
          />
          Personalizar etapas
        </label>
        <div className="text-xs text-neutral-500 dark:text-neutral-500">
          {loadingStages ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />A carregar etapas…
            </span>
          ) : stagesFromApi?.length ? (
            <span>{stagesFromApi.length} etapas no projeto</span>
          ) : (
            <span>Etapas indisponíveis</span>
          )}
        </div>
      </div>

      {!state.draft.customizeStages ? (
        <ul className="dark:divide-surface-dark-border dark:border-surface-dark-border mt-3 divide-y divide-neutral-100 rounded-md border border-neutral-100">
          {defaults.map((s, i) => (
            <li key={i} className="flex items-center gap-2 px-2 py-2 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-neutral-800 dark:text-neutral-100">{s.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 space-y-2">
          {(state.draft.stageDrafts.length ? state.draft.stageDrafts : defaults).map((row, i) => (
            <div
              key={i}
              className="dark:border-surface-dark-border flex flex-col gap-2 rounded-md border border-neutral-100 bg-neutral-50/80 p-2 sm:flex-row sm:items-center dark:bg-[#1d1d1b]/40"
            >
              <div className="flex items-center gap-1 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => moveStage(i, -1)}
                  disabled={i === 0}
                  className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                  aria-label="Mover etapa para cima"
                  title="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => moveStage(i, 1)}
                  disabled={
                    i ===
                    (state.draft.stageDrafts.length
                      ? state.draft.stageDrafts.length
                      : defaults.length) -
                      1
                  }
                  className="rounded-md p-1 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30 dark:hover:bg-neutral-800"
                  aria-label="Mover etapa para baixo"
                  title="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <input
                type="text"
                value={
                  (state.draft.stageDrafts.length ? state.draft.stageDrafts : defaults)[i]?.name ??
                  row.name
                }
                onChange={(e) =>
                  actions.setStageDrafts((prev) => {
                    const base = prev.length ? [...prev] : [...defaults];
                    base[i] = { ...base[i], name: e.target.value };
                    return base;
                  })
                }
                className="dark:border-surface-dark-border-strong min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm dark:bg-[#1d1d1b] dark:text-neutral-100"
                placeholder="Nome da coluna"
              />
              <input
                type="text"
                value={
                  (state.draft.stageDrafts.length ? state.draft.stageDrafts : defaults)[i]?.color ??
                  row.color
                }
                onChange={(e) =>
                  actions.setStageDrafts((prev) => {
                    const base = prev.length ? [...prev] : [...defaults];
                    base[i] = { ...base[i], color: e.target.value };
                    return base;
                  })
                }
                className="dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-white px-2 py-2 font-mono text-xs sm:w-28 dark:bg-[#1d1d1b] dark:text-neutral-100"
                placeholder="#hex"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => actions.goToStep("collaborators")}
          className="rounded-md bg-neutral-900 px-2 py-2 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-neutral-200"
        >
          Pular
        </button>
        <button
          type="button"
          onClick={onApplyAndContinue}
          className="bg-brand-primary-500 rounded-md px-2 py-2 text-sm font-bold text-neutral-950 transition hover:brightness-95"
        >
          Aplicar e continuar
        </button>
      </div>
    </section>
  );
}
