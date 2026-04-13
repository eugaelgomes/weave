"use client";

import React, { useState, useEffect } from "react";
import { useProjects } from "@/app/_contexts/projects-context";
import {
  Project,
  ProjectStage,
  ProjectNote,
} from "@/app/_services/projects-service/projects-service";
import {
  Folder,
  FileText,
  Columns3,
  List,
  Calendar,
  GanttChart,
  Timer,
  LayoutGrid,
  GripVertical,
  CheckCircle2,
  Flag,
  Activity,
  Clock,
  Zap,
  Tag,
  Users,
} from "lucide-react";

interface ProjectsDashboardProps {
  projectId: string;
}

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Andamento",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};

const statusColors: Record<string, string> = {
  open: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  archived: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
};

const priorityLabels: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const methodologyLabels: Record<string, string> = {
  scrum: "Scrum",
  kanban: "Kanban",
  waterfall: "Waterfall",
  custom: "Personalizado",
};

const ProjectsDashboard = ({ projectId }: ProjectsDashboardProps) => {
  const { getProjectById, getProjectStages, getProjectNotes } = useProjects();

  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [projectNotes, setProjectNotes] = useState<ProjectNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<
    "board" | "list" | "calendar" | "timeline" | "gantt"
  >("board");

  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async () => {
      try {
        setLoading(true);
        const projectData = await getProjectById(projectId);
        if (projectData) {
          setProject(projectData);
          if (projectData.default_view) {
            setActiveView(projectData.default_view);
          }
        }

        const [stagesData, notesData] = await Promise.all([
          getProjectStages(projectId).catch(() => []),
          getProjectNotes(projectId).catch(() => []),
        ]);

        setStages(stagesData);
        setProjectNotes(notesData);
      } catch (error) {
        console.error("Erro ao carregar projeto:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [projectId, getProjectById, getProjectStages, getProjectNotes]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Projeto não encontrado</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in flex h-full flex-col duration-300">
      {/* Header do Projeto */}
      <header className="mb-4 border-b border-neutral-100 pb-3 dark:border-neutral-900">
        <div className="mb-1 flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: project.properties?.color || "#3f51b5" }}
          >
            <Folder className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              {project.title}
            </h1>
            {project.description && (
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {project.description}
              </p>
            )}
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[project.status] || statusColors.open}`}
          >
            {statusLabels[project.status] || project.status}
          </span>
        </div>
      </header>

      {/* Info Cards */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-0.5 flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-neutral-400" />
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-500">
              Metodologia
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
            {methodologyLabels[project.methodology] || project.methodology}
          </p>
        </div>

        {project.properties?.priority && (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/30">
            <div className="mb-0.5 flex items-center gap-1.5">
              <Flag className="h-3 w-3 text-neutral-400" />
              <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-500">
                Prioridade
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {priorityLabels[project.properties.priority] || project.properties.priority}
            </p>
          </div>
        )}

        {project.properties?.complexity && (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/30">
            <div className="mb-0.5 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-neutral-400" />
              <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-500">
                Complexidade
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {priorityLabels[project.properties.complexity] || project.properties.complexity}
            </p>
          </div>
        )}

        {project.properties?.estimated_time && (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900/30">
            <div className="mb-0.5 flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-neutral-400" />
              <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-500">
                Tempo Est.
              </span>
            </div>
            <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
              {project.properties.estimated_time}
            </p>
          </div>
        )}
      </div>

      {/* Tags */}
      {project.properties?.tags && project.properties.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <Tag className="h-3 w-3 text-neutral-400" />
          {project.properties.tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Visualização - Seletor de View + Stages */}
      <div className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950">
        {/* Header com seletor de view */}
        <div className="mb-2 flex flex-col gap-2 border-b border-neutral-200 pb-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded border border-yellow-400/20 bg-yellow-400/10 text-brand-primary-500 dark:text-yellow-400">
              <LayoutGrid className="h-3 w-3" />
            </div>
            <h2 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-500">
              Visualização
            </h2>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-600">
              · {stages.length} estágio{stages.length !== 1 ? "s" : ""} · {projectNotes.length} nota
              {projectNotes.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* View Type Buttons */}
          <div className="flex items-center gap-0.5 rounded-md border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
            {[
              { value: "board" as const, label: "Quadro", icon: <Columns3 className="h-3 w-3" /> },
              { value: "list" as const, label: "Lista", icon: <List className="h-3 w-3" /> },
              {
                value: "calendar" as const,
                label: "Calendário",
                icon: <Calendar className="h-3 w-3" />,
              },
              {
                value: "timeline" as const,
                label: "Timeline",
                icon: <Timer className="h-3 w-3" />,
              },
              { value: "gantt" as const, label: "Gantt", icon: <GanttChart className="h-3 w-3" /> },
            ].map((view) => (
              <button
                key={view.value}
                onClick={() => setActiveView(view.value)}
                title={view.label}
                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-all ${
                  activeView === view.value
                    ? "bg-brand-primary-500/15 text-yellow-600 shadow-sm dark:bg-brand-primary-500/20 dark:text-yellow-400"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {view.icon}
                <span className="hidden sm:inline">{view.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da View */}
        {activeView === "board" && stages.length > 0 ? (
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-2">
            {stages
              .sort((a, b) => a.position - b.position)
              .map((stage) => {
                const stageNotes = projectNotes.filter(
                  (note) => note.project_stage_id === stage.id
                );
                const isDoneStage = stage.properties?.is_done;
                return (
                  <div
                    key={stage.id}
                    className="flex w-[230px] flex-shrink-0 flex-col rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between border-b border-neutral-200 px-2.5 py-2 dark:border-neutral-800">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: stage.color || "#737373" }}
                        />
                        <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-200">
                          {stage.name}
                        </span>
                        {isDoneStage && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      </div>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {stageNotes.length}
                      </span>
                    </div>

                    {/* Stage Content */}
                    <div className="flex-1 space-y-1.5 p-1.5">
                      {stageNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 py-4 dark:border-neutral-800">
                          <FileText className="mb-1 h-4 w-4 text-neutral-300 dark:text-neutral-700" />
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-600">
                            Sem notas neste estágio
                          </p>
                        </div>
                      ) : (
                        stageNotes.map((note) => (
                          <div
                            key={note.id}
                            className="group rounded border border-neutral-200 bg-neutral-50 p-2 transition-all hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                          >
                            <div className="mb-1 flex items-start justify-between gap-1.5">
                              <p className="flex-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-200">
                                {note.title}
                              </p>
                              <GripVertical className="h-3 w-3 flex-shrink-0 text-neutral-300 dark:text-neutral-700" />
                            </div>
                            {note.tags && note.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {note.tags.slice(0, 3).map((tag, i) => (
                                  <span
                                    key={i}
                                    className="rounded bg-neutral-200/70 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500 dark:bg-neutral-800/70 dark:text-neutral-400"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* WIP Limit indicator */}
                    {stage.properties?.wip_limit && (
                      <div className="border-t border-neutral-200 px-2.5 py-1 dark:border-neutral-800">
                        <p
                          className={`text-[10px] font-medium ${
                            stageNotes.length >= stage.properties.wip_limit
                              ? "text-red-500"
                              : "text-neutral-400 dark:text-neutral-600"
                          }`}
                        >
                          WIP: {stageNotes.length}/{stage.properties.wip_limit}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : activeView === "board" && stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 py-8 dark:border-neutral-800">
            <Columns3 className="mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
            <p className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Nenhum estágio configurado
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
              Configure estágios para visualizar o quadro Kanban
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 py-8 dark:border-neutral-800">
            <LayoutGrid className="mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
            <p className="mb-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Visualização &quot;
              {activeView === "list"
                ? "Lista"
                : activeView === "calendar"
                  ? "Calendário"
                  : activeView === "timeline"
                    ? "Timeline"
                    : "Gantt"}
              &quot; em breve
            </p>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
              Por enquanto, utilize a visualização Quadro
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsDashboard;
