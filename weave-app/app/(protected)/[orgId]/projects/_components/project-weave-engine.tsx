"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Clock,
  AlertCircle,
  BookOpen,
  Zap,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/app/_contexts/language-context";
import { WeaveEngineIcon } from "@/app/(protected)/_components/layout/icons/weave-engine-icon";

interface ProjectWeaveEngineProps {
  project: {
    id: string;
    title?: string;
    description?: string;
    public_id?: string;
  };
  projectNotes: any[];
  stages: any[];
  collaborators: any[];
}

interface Insight {
  id: string;
  type: "overdue" | "bottleneck" | "documentation" | "priority" | "default";
  titleEn: string;
  titlePt: string;
  descEn: string;
  descPt: string;
  primaryActionEn: string;
  primaryActionPt: string;
  secondaryActionEn?: string;
  secondaryActionPt?: string;
  icon: React.ComponentType<any>;
  colorClass: string;
}

export default function ProjectWeaveEngine({
  project,
  projectNotes = [],
  stages = [],
  collaborators = [],
}: ProjectWeaveEngineProps) {
  const { locale } = useLanguage();
  const isPt = locale === "pt-BR";

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Generate dynamic mock insights based on current project data
  const initialInsights = useMemo(() => {
    const list: Insight[] = [];

    // 1. Check for overdue tasks
    const todayStr = new Date().toISOString();
    const overdueTasks = projectNotes.filter(
      (note) => note.due_date && note.due_date < todayStr && note.project_stage_id !== "done"
    );

    if (overdueTasks.length > 0) {
      list.push({
        id: "overdue",
        type: "overdue",
        titlePt: "Tarefas em atraso detectadas",
        titleEn: "Overdue tasks detected",
        descPt: `Identificamos ${overdueTasks.length} ${overdueTasks.length === 1 ? "tarefa" : "tarefas"} com data de entrega expirada. Deseja reagendar para amanhã ou notificar os responsáveis?`,
        descEn: `We identified ${overdueTasks.length} ${overdueTasks.length === 1 ? "task" : "tasks"} past the due date. Would you like to reschedule them to tomorrow or notify the assignees?`,
        primaryActionPt: "Reagendar para amanhã",
        primaryActionEn: "Reschedule to tomorrow",
        secondaryActionPt: "Notificar responsáveis",
        secondaryActionEn: "Notify assignees",
        icon: Clock,
        colorClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      });
    }

    // 2. Check for bottleneck in columns
    // Count tasks per stage
    const stageCounts: Record<string, number> = {};
    projectNotes.forEach((note) => {
      if (note.project_stage_id) {
        stageCounts[note.project_stage_id] = (stageCounts[note.project_stage_id] || 0) + 1;
      }
    });

    // Find if any stage has bottleneck (e.g. >= 4 tasks, and not the 'Done' / completed stage if we can identify it)
    const bottleneckStageId = Object.keys(stageCounts).find((stageId) => {
      const stage = stages.find((s) => s.id === stageId);
      const isDone =
        stage?.name?.toLowerCase().includes("done") ||
        stage?.name?.toLowerCase().includes("concluído");
      return stageCounts[stageId] >= 4 && !isDone;
    });

    if (bottleneckStageId) {
      const stageName = stages.find((s) => s.id === bottleneckStageId)?.name || "";
      list.push({
        id: "bottleneck",
        type: "bottleneck",
        titlePt: `Gargalo em: ${stageName}`,
        titleEn: `Bottleneck in: ${stageName}`,
        descPt: `A coluna "${stageName}" está com ${stageCounts[bottleneckStageId]} tarefas acumuladas. Sugerimos redistribuir as tarefas ou realizar um alinhamento rápido com o time.`,
        descEn: `The column "${stageName}" has ${stageCounts[bottleneckStageId]} tasks accumulated. We suggest redistributing work or starting a quick sync with the team.`,
        primaryActionPt: "Redistribuir demandas",
        primaryActionEn: "Redistribute tasks",
        secondaryActionPt: "Criar nota de sync",
        secondaryActionEn: "Create sync note",
        icon: AlertCircle,
        colorClass: "text-red-500 bg-red-500/10 border-red-500/20",
      });
    }

    // 3. Check if project description is missing
    if (!project.description || project.description.trim().length < 10) {
      list.push({
        id: "documentation",
        type: "documentation",
        titlePt: "Sumário do projeto ausente",
        titleEn: "Project summary missing",
        descPt:
          "Este projeto não possui uma descrição estruturada. Deixe a IA analisar as tarefas e redigir uma descrição profissional de forma autônoma.",
        descEn:
          "This project lacks a structured description. Let the AI analyze the tasks and automatically draft a professional description.",
        primaryActionPt: "Gerar descrição com IA",
        primaryActionEn: "Generate description with AI",
        icon: BookOpen,
        colorClass: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      });
    }

    // 4. Task optimization / prioritisation recommendation
    const highPriorityTasks = projectNotes.filter((note) => {
      // Mock check or priority matching
      return (
        note.priority_id && (note.priority_id.includes("high") || note.priority_id.includes("alta"))
      );
    });
    if (highPriorityTasks.length > 0) {
      list.push({
        id: "priority",
        type: "priority",
        titlePt: "Priorização inteligente de sprint",
        titleEn: "Smart sprint prioritization",
        descPt: `Encontramos ${highPriorityTasks.length} tarefas críticas pendentes. Deseja que a IA crie subtarefas e estime prazos para acelerar a entrega?`,
        descEn: `We found ${highPriorityTasks.length} critical pending tasks. Would you like the AI to generate subtasks and estimate timelines to speed up delivery?`,
        primaryActionPt: "Gerar plano de ação",
        primaryActionEn: "Generate action plan",
        icon: Zap,
        colorClass: "text-purple-500 bg-purple-500/10 border-purple-500/20",
      });
    }

    // 5. Default predictive insight (always present to make it interesting)
    list.push({
      id: "default",
      type: "default",
      titlePt: "Análise preditiva de conclusão",
      titleEn: "Predictive completion analysis",
      descPt:
        "Analisando a velocidade recente e o volume de tarefas, estimamos que a meta do projeto seja atingida com 4 dias de antecedência.",
      descEn:
        "Analyzing recent velocity and task volume, we estimate the project target will be achieved 4 days ahead of schedule.",
      primaryActionPt: "Ver projeção detalhada",
      primaryActionEn: "View detailed forecast",
      icon: Sparkles,
      colorClass:
        "text-brand-yellow bg-brand-yellow/10 border-brand-yellow/20 dark:text-yellow-400 dark:bg-yellow-400/10 dark:border-yellow-400/20",
    });

    return list;
  }, [project, projectNotes, stages]);

  const [activeInsights, setActiveInsights] = useState<Insight[]>([]);

  useEffect(() => {
    setActiveInsights(initialInsights);
    setCurrentIndex(0);
  }, [initialInsights]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % activeInsights.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + activeInsights.length) % activeInsights.length);
  };

  const handleAction = async (actionType: "primary" | "secondary", insight: Insight) => {
    const actionKey = `${insight.id}-${actionType}`;
    setLoadingAction(actionKey);

    // Simulate agentic computation
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setLoadingAction(null);

    // Toast and dismiss insight
    let msg = "";
    if (insight.type === "overdue") {
      msg =
        actionType === "primary"
          ? isPt
            ? "Tarefas remarcadas com sucesso!"
            : "Tasks rescheduled successfully!"
          : isPt
            ? "Colaboradores notificados no canal!"
            : "Collaborators notified in chat!";
    } else if (insight.type === "bottleneck") {
      msg =
        actionType === "primary"
          ? isPt
            ? "Demanda equilibrada! Tarefas redistribuídas."
            : "Backlog balanced! Tasks redistributed."
          : isPt
            ? "Reunião de alinhamento agendada com notas criadas!"
            : "Sync meeting scheduled with draft notes created!";
    } else if (insight.type === "documentation") {
      msg = isPt
        ? "Descrição profissional gerada e aplicada!"
        : "Professional description generated and applied!";
    } else if (insight.type === "priority") {
      msg = isPt
        ? "Subtarefas e cronograma inseridos no Board!"
        : "Subtasks and timeline added to the Board!";
    } else {
      msg = isPt
        ? "Abrindo painel de análise preditiva..."
        : "Opening predictive analysis panel...";
    }

    toast.success(msg);

    // Remove insight from active list
    setActiveInsights((prev) => {
      const next = prev.filter((item) => item.id !== insight.id);
      // Adjust index
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1);
      }
      return next;
    });
  };

  const handleDismiss = (insight: Insight) => {
    toast.info(isPt ? "Insight arquivado." : "Insight archived.");
    setActiveInsights((prev) => {
      const next = prev.filter((item) => item.id !== insight.id);
      if (currentIndex >= next.length && next.length > 0) {
        setCurrentIndex(next.length - 1);
      }
      return next;
    });
  };

  const handleScan = async () => {
    setIsScanning(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsScanning(false);
    setActiveInsights(initialInsights);
    setCurrentIndex(0);
    toast.success(
      isPt ? "Varredura concluída! Insights atualizados." : "Scan completed! Insights updated."
    );
  };

  const currentInsight = activeInsights[currentIndex];

  return (
    <div className="w-full shrink-0 border-b border-neutral-100 bg-transparent transition-all duration-300 dark:border-neutral-800/40">
      {/* Header section */}
      <div className="flex items-center justify-between px-3 py-1.5 sm:py-2">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="bg-brand-yellow/80 absolute inline-flex h-2 w-2 animate-ping rounded-full opacity-75 dark:bg-yellow-400/80"></span>
            <WeaveEngineIcon className="relative h-4 w-4" tone="attention" monochrome={false} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-fredoka text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
              Weave Engine
            </span>
            <span className="hidden rounded-full bg-neutral-200/60 px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-neutral-500 uppercase sm:inline-block dark:bg-neutral-800/80 dark:text-neutral-400">
              {isPt ? "IA Proativa" : "Proactive AI"}
            </span>
          </div>
          {activeInsights.length > 0 && (
            <div className="ml-2 flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-px text-[9px] font-medium text-amber-600 dark:text-amber-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              </span>
              <span>
                {activeInsights.length} {isPt ? "alertas" : "alerts"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick scan button */}
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-1 rounded border border-transparent bg-white/40 px-2 py-0.5 text-[9px] font-medium text-neutral-500 transition-colors hover:border-neutral-200 hover:text-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-400 dark:hover:border-neutral-800 dark:hover:text-neutral-200"
          >
            <RefreshCw
              className={`h-2.5 w-2.5 ${isScanning ? "text-brand-yellow animate-spin" : ""}`}
            />
            <span>
              {isScanning ? (isPt ? "Analisando..." : "Analyzing...") : isPt ? "Escanear" : "Scan"}
            </span>
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-center rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200/50 hover:text-neutral-600 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-200"
            title={isCollapsed ? (isPt ? "Expandir" : "Expand") : isPt ? "Recolher" : "Collapse"}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main insights container with smooth height transitions */}
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isCollapsed ? "max-h-0" : "max-h-56 pb-2.5 sm:pb-3"
        }`}
      >
        <div className="px-3">
          {activeInsights.length === 0 ? (
            /* Empty State */
            <div className="animate-in fade-in flex flex-col items-center justify-between gap-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 duration-300 sm:flex-row dark:border-emerald-500/10 dark:bg-emerald-950/10">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                    {isPt ? "Weave Engine: Tudo operacional" : "Weave Engine: All clear"}
                  </h4>
                  <p className="mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                    {isPt
                      ? "Nenhum gargalo ou desvio de escopo detectado nesta varredura. IA proativa ativa."
                      : "No bottlenecks or scope creep detected in this scan. Proactive AI monitoring."}
                  </p>
                </div>
              </div>
              <button
                onClick={handleScan}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[9px] font-semibold text-emerald-700 transition-all hover:bg-emerald-500/20 dark:text-emerald-300"
              >
                <span>{isPt ? "Nova varredura" : "Scan again"}</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            </div>
          ) : (
            /* Active Insight Card */
            <div className="group animate-in fade-in zoom-in-95 relative overflow-hidden rounded-lg border border-neutral-200/80 bg-white p-3 shadow-sm duration-200 dark:border-neutral-800/80 dark:bg-[#1d1d1b]">
              {/* Decorative side accent */}
              <div className="from-brand-yellow absolute top-0 bottom-0 left-0 w-[3px] rounded-l bg-gradient-to-b to-amber-500" />

              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 items-start gap-3">
                  {/* Insight Icon wrapper */}
                  <div className={`shrink-0 rounded-lg border p-1.5 ${currentInsight.colorClass}`}>
                    {React.createElement(currentInsight.icon, { className: "h-3.5 w-3.5" })}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-[11px] font-bold text-neutral-800 dark:text-neutral-100">
                        {isPt ? currentInsight.titlePt : currentInsight.titleEn}
                      </h4>
                      <span className="font-mono text-[9px] text-neutral-400 dark:text-neutral-500">
                        ({currentIndex + 1}/{activeInsights.length})
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                      {isPt ? currentInsight.descPt : currentInsight.descEn}
                    </p>
                  </div>
                </div>

                {/* Actions area */}
                <div className="mt-1 flex shrink-0 items-center gap-2 self-end sm:mt-0 sm:self-center">
                  {/* Secondary Action if exists */}
                  {(currentInsight.secondaryActionPt || currentInsight.secondaryActionEn) && (
                    <button
                      onClick={() => handleAction("secondary", currentInsight)}
                      disabled={loadingAction !== null}
                      className="rounded bg-neutral-100 px-2.5 py-1 text-[9px] font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      {loadingAction === `${currentInsight.id}-secondary` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isPt ? (
                        currentInsight.secondaryActionPt
                      ) : (
                        currentInsight.secondaryActionEn
                      )}
                    </button>
                  )}

                  {/* Primary Action */}
                  <button
                    onClick={() => handleAction("primary", currentInsight)}
                    disabled={loadingAction !== null}
                    className="bg-brand-yellow text-brand-navy shadow-brand-yellow/10 flex items-center gap-1 rounded px-2.5 py-1 text-[9px] font-medium font-semibold shadow-sm transition-colors hover:bg-yellow-400"
                  >
                    {loadingAction === `${currentInsight.id}-primary` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <span>
                          {isPt ? currentInsight.primaryActionPt : currentInsight.primaryActionEn}
                        </span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </>
                    )}
                  </button>

                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismiss(currentInsight)}
                    disabled={loadingAction !== null}
                    className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    title={isPt ? "Ignorar" : "Dismiss"}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Slider Controls (Only show if multiple insights exist) */}
              {activeInsights.length > 1 && (
                <div className="mt-2.5 flex justify-end gap-1.5 border-t border-neutral-100 pt-2 dark:border-neutral-800/40">
                  <button
                    onClick={handlePrev}
                    className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-200"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-200"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
