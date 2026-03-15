"use client";

import React, { useEffect } from "react";
import { useProjects } from "@/app/_contexts/projects-context";
import {
  Folder,
  Users,
  CheckCircle2,
  FileText,
  CheckSquare,
  TrendingUp,
  Activity,
  BarChart2,
  Flame,
} from "lucide-react";

const methodologyLabels: Record<string, string> = {
  kanban: "Kanban",
  scrum: "Scrum",
  waterfall: "Waterfall",
  custom: "Personalizado",
};

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};

const statusColors: Record<string, string> = {
  open: "bg-cyan-500",
  in_progress: "bg-blue-500",
  paused: "bg-yellow-500",
  completed: "bg-green-500",
  archived: "bg-neutral-400",
};

const ProjectsOverview = () => {
  const { projectsStats, fetchProjectsStats, loading } = useProjects();

  useEffect(() => {
    fetchProjectsStats();
  }, [fetchProjectsStats]);

  if (loading && !projectsStats) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!projectsStats) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Nenhum dado disponível
        </p>
      </div>
    );
  }

  const { overview, methodology, progress, notes, tasks } = projectsStats;
  const totalMethodology = Object.values(methodology).reduce((a, b) => a + b, 0);
  const totalStatus = overview.total || 1;

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-neutral-100 pb-3 dark:border-neutral-900">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-yellow-400/10 text-yellow-500 dark:text-yellow-400">
          <BarChart2 className="h-3.5 w-3.5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Visão Geral
          </h1>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {overview.total} projeto{overview.total !== 1 ? "s" : ""} no total
          </p>
        </div>
      </div>

      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          icon={<Folder className="h-3.5 w-3.5" />}
          label="Total"
          value={overview.total}
          color="text-neutral-600 dark:text-neutral-300"
          bg="bg-neutral-100 dark:bg-neutral-800"
        />
        <StatCard
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Ativos"
          value={overview.active}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-50 dark:bg-blue-900/20"
        />
        <StatCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Concluídos"
          value={overview.by_status.completed}
          color="text-green-600 dark:text-green-400"
          bg="bg-green-50 dark:bg-green-900/20"
        />
        <StatCard
          icon={<Users className="h-3.5 w-3.5" />}
          label="Colaborando"
          value={overview.collaborating}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-900/20"
        />
      </div>

      {/* Progress + Tasks — row 2 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Progresso Médio */}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
              Progresso Médio
            </span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {progress.average}
              <span className="text-sm font-normal text-neutral-400">%</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all duration-500"
              style={{ width: `${Math.min(progress.average, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
            <span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {progress.near_completion}
              </span>{" "}
              próx. de concluir
            </span>
            <span>
              <span className="font-medium text-neutral-500">{progress.not_started}</span> não
              iniciados
            </span>
          </div>
        </div>

        {/* Tarefas */}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-2 flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
              Tarefas
            </span>
          </div>
          <div className="mb-2 flex items-end gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {tasks.completion_rate}
              <span className="text-sm font-normal text-neutral-400">%</span>
            </span>
            <span className="mb-1 text-[11px] text-neutral-500">conclusão</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-blue-400 transition-all duration-500"
              style={{ width: `${Math.min(tasks.completion_rate, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
            <span>
              <span className="font-medium text-green-600 dark:text-green-400">{tasks.done}</span>{" "}
              feitas
            </span>
            <span>
              <span className="font-medium text-neutral-500">{tasks.pending}</span> pendentes
            </span>
            <span>
              <span className="font-medium">{tasks.total}</span> total
            </span>
          </div>
        </div>
      </div>

      {/* Status distribution + Methodology — row 3 */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Status */}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
              Por Status
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(overview.by_status).map(([key, count]) => {
              const pct = Math.round((count / totalStatus) * 100);
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-20 truncate text-[10px] text-neutral-600 dark:text-neutral-400">
                    {statusLabels[key] ?? key}
                  </span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className={`h-full rounded-full ${statusColors[key] ?? "bg-neutral-400"} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metodologia */}
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-2.5 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
              Metodologia
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(methodology).map(([key, count]) => {
              const pct =
                totalMethodology > 0 ? Math.round((count / totalMethodology) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-20 truncate text-[10px] text-neutral-600 dark:text-neutral-400">
                    {methodologyLabels[key] ?? key}
                  </span>
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Notes — row 4 */}
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
        <div className="mb-2.5 flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
            Notas
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <NoteStatItem label="Total" value={notes.total} color="text-neutral-700 dark:text-neutral-200" />
          <NoteStatItem label="Visíveis" value={notes.visible} color="text-teal-600 dark:text-teal-400" />
          <NoteStatItem label="Arquivadas" value={notes.archived} color="text-yellow-600 dark:text-yellow-400" />
          <NoteStatItem label="Seguras" value={notes.secure} color="text-red-600 dark:text-red-400" />
        </div>
      </div>
    </div>
  );
};

function StatCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/30">
      <div className="mb-1 flex items-center gap-1.5">
        <span className={`rounded p-0.5 ${bg} ${color}`}>{icon}</span>
        <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function NoteStatItem({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className={`text-base font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default ProjectsOverview;
