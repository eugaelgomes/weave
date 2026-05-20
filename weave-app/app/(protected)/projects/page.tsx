"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import { fetchProjectReasonings } from "@/app/_services/projects-service/reasonings-service";
import { track } from "@vercel/analytics";
import { AlertTriangle, BrainCircuit, FileWarning, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type RiskLevel = "low" | "medium" | "high";

type ProjectEngineSignal = {
  projectId: string;
  riskLevel: RiskLevel;
  lastBriefingAt: string | null;
  suggestedActions: number;
  hasNewBriefing: boolean;
};

const dayMs = 24 * 60 * 60 * 1000;
const weekMs = 7 * dayMs;

function formatRelativeDate(value: string | null): string {
  if (!value) return "Sem briefing";
  const when = new Date(value).getTime();
  if (Number.isNaN(when)) return "Sem briefing";
  const diff = Date.now() - when;
  if (diff < 60_000) return "Agora mesmo";
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} min`;
  if (diff < dayMs) return `${Math.max(1, Math.floor(diff / 3_600_000))} h`;
  return `${Math.max(1, Math.floor(diff / dayMs))} d`;
}

const ProjectsPage = () => {
  const router = useRouter();
  const { canCreateProject } = usePlanUsage();
  const { loading, getRecentProjects } = useProjects();
  const { triggerReasoningNow } = useWeaveEngine();
  const projects = getRecentProjects();
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [signalsError, setSignalsError] = useState<string | null>(null);
  const [signalsByProjectId, setSignalsByProjectId] = useState<
    Map<string, ProjectEngineSignal>
  >(new Map());

  const handleCreateProject = () => {
    if (!canCreateProject) {
      toast.error("Limite do Plano Atingido", {
        description: "Você atingiu o limite de projetos do seu plano.",
        duration: 6000,
        action: {
          label: "Ver Planos",
          onClick: () => router.push("/settings?tab=plan"),
        },
      });
      return;
    }
    router.push("/projects/new");
  };

  const fetchSignals = React.useCallback(async () => {
    if (projects.length === 0) {
      setSignalsByProjectId(new Map());
      setSignalsLoading(false);
      return;
    }
    setSignalsLoading(true);
    setSignalsError(null);
    try {
      const entries = await Promise.all(
        projects.map(async (project) => {
          const reasonings = await fetchProjectReasonings(project.id, { limit: 8 });
          const newest = reasonings[0];
          const hasHighRisk = reasonings.some((item) => item.safety_label === "unsafe");
          const hasMediumRisk = reasonings.some((item) => item.safety_label === "review");
          const riskLevel: RiskLevel = hasHighRisk
            ? "high"
            : hasMediumRisk
              ? "medium"
              : "low";
          const suggestedActions = reasonings.reduce(
            (acc, item) => acc + (item.action_items_count || 0),
            0
          );
          const newestTimestamp = newest?.created_at
            ? new Date(newest.created_at).getTime()
            : 0;
          const hasNewBriefing =
            newestTimestamp > 0 && Date.now() - newestTimestamp <= dayMs;

          return [
            project.id,
            {
              projectId: project.id,
              riskLevel,
              lastBriefingAt: newest?.created_at || null,
              suggestedActions,
              hasNewBriefing,
            } satisfies ProjectEngineSignal,
          ] as const;
        })
      );
      setSignalsByProjectId(new Map(entries));
    } catch (error) {
      setSignalsError(
        error instanceof Error ? error.message : "Falha ao carregar sinais do Engine."
      );
    } finally {
      setSignalsLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    void fetchSignals();
  }, [fetchSignals]);

  const aggregate = useMemo(() => {
    const values = Array.from(signalsByProjectId.values());
    const risksHigh = values.filter((value) => value.riskLevel === "high").length;
    const recentBriefings = values.filter((value) => {
      if (!value.lastBriefingAt) return false;
      const timestamp = new Date(value.lastBriefingAt).getTime();
      return !Number.isNaN(timestamp) && Date.now() - timestamp <= weekMs;
    }).length;
    const suggestedActions = values.reduce(
      (acc, value) => acc + value.suggestedActions,
      0
    );
    return { risksHigh, recentBriefings, suggestedActions };
  }, [signalsByProjectId]);

  const handleGenerateBriefing = async (projectId: string) => {
    try {
      await triggerReasoningNow(projectId, { reasoningType: "analysis" });
      track("weave_engine_generate_briefing", { source: "projects_overview", projectId });
      toast.success("Solicitação enviada para o Weave Engine.");
      await fetchSignals();
    } catch (error) {
      toast.error("Não foi possível gerar briefing agora.", {
        description: error instanceof Error ? error.message : "Erro inesperado.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-2 py-1 dark:border-surface-dark-border">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            Overview dos Projetos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateProject}
            title={!canCreateProject ? "Limite de projetos do plano atingido" : undefined}
            disabled={!canCreateProject}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] transition-all ${
              canCreateProject
                ? "bg-brand-yellow text-brand-navy hover:brightness-95"
                : "cursor-not-allowed bg-neutral-100 text-neutral-400 dark:bg-[#1d1d1b] dark:text-neutral-500"
            }`}
          >
            <Plus className="h-2 w-2" />
            <span>Criar projeto</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-2 sm:p-3">
        <section className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Visão do Weave Engine
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Insights operacionais do portfólio de projetos.
              </p>
            </div>
            <Link
              href="/weave-engine"
              className="inline-flex items-center gap-1 rounded-md bg-brand-primary-500 px-2 py-1 text-[11px] font-semibold text-neutral-900 hover:brightness-95"
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              Abrir Weave Engine
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-neutral-200 bg-white p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
              <div className="text-[10px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
                Resumo da semana
              </div>
              <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {signalsLoading ? "..." : aggregate.recentBriefings}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                briefings recentes
              </div>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
              <div className="text-[10px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
                Riscos críticos
              </div>
              <div className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
                {signalsLoading ? "..." : aggregate.risksHigh}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                projetos com risco alto
              </div>
            </div>
            <div className="rounded-md border border-neutral-200 bg-white p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
              <div className="text-[10px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
                Ações recomendadas
              </div>
              <div className="mt-1 text-xl font-bold text-neutral-900 dark:text-neutral-100">
                {signalsLoading ? "..." : aggregate.suggestedActions}
              </div>
              <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                itens sugeridos pelo Engine
              </div>
            </div>
          </div>
        </section>

        {signalsError ? (
          <section className="rounded-md border border-red-200 bg-white p-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-[#1d1d1b] dark:text-red-300">
            Não foi possível carregar sinais do Weave Engine. {signalsError}
          </section>
        ) : null}

        {projects.length === 0 ? (
          <section className="rounded-md border border-neutral-200 bg-white p-4 text-center dark:border-surface-dark-border dark:bg-[#1d1d1b]">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Você ainda não tem projetos para gerar insights do Weave Engine.
            </p>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={!canCreateProject}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-primary-500 px-2 py-1 text-[11px] font-semibold text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Criar primeiro projeto
            </button>
          </section>
        ) : (
          <section className="grid gap-2">
            {projects.map((project) => {
              const signal = signalsByProjectId.get(project.id);
              const riskLabel =
                signal?.riskLevel === "high"
                  ? "Alto"
                  : signal?.riskLevel === "medium"
                    ? "Médio"
                    : "Baixo";
              const riskClass =
                signal?.riskLevel === "high"
                  ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                  : signal?.riskLevel === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";

              return (
                <article
                  key={project.id}
                  className="rounded-md border border-neutral-200 bg-white p-3 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {project.title}
                        </h3>
                        {signal?.hasNewBriefing ? (
                          <span className="rounded-full border border-brand-primary-500/50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-primary-700 dark:text-brand-primary-400">
                            Novo briefing
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span className={`rounded-md px-1.5 py-0.5 font-semibold ${riskClass}`}>
                          Risco {riskLabel}
                        </span>
                        <span>
                          Último briefing: {formatRelativeDate(signal?.lastBriefingAt || null)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {signal?.suggestedActions || 0} ações sugeridas
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleGenerateBriefing(project.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-200 dark:hover:bg-neutral-900"
                      >
                        <BrainCircuit className="h-3.5 w-3.5" />
                        Abrir briefing
                      </button>
                      <Link
                        href={`/weave-engine?projectId=${project.id}&view=risks`}
                        className="inline-flex items-center gap-1 rounded-md bg-brand-primary-500 px-2 py-1 text-[11px] font-semibold text-neutral-900 hover:brightness-95"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Ver riscos
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!signalsLoading && projects.length > 0 && signalsByProjectId.size === 0 ? (
          <section className="rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-500 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-400">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              Nenhum insight disponível por enquanto. Gere um briefing para iniciar o contexto.
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default ProjectsPage;
