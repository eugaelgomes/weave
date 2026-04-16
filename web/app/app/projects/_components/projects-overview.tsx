"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import {
  FileText,
  BarChart2,
  Users,
  UserRound,
  AlertTriangle,
  Plus,
  Layers3,
  Flag,
  Folder,
  ChevronRight,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  paused: "Pausado",
  completed: "Concluído",
  archived: "Arquivado",
};

type ProjectNoteLike = {
  id?: string;
  status?: string;
  project_stage_id?: string | null;
  created_by?: {
    user_id?: string;
  };
};

type StageLike = {
  id: string;
  name: string;
};

type ProjectLike = {
  id: string;
  title: string;
  status: string;
  properties?: {
    color?: string | null;
  };
  notes?: ProjectNoteLike[];
  stages?: StageLike[];
};

type FullNoteLike = {
  id?: string;
  project_id?: string;
  associated_project?: {
    id?: string;
  } | null;
  due_date?: string | null;
  priority_name?: string | null;
  priority_id?: string | null;
  properties?: {
    priority?: string;
  };
  user_id?: string;
  author?: {
    id?: string;
  };
  collaborators?: Array<unknown>;
};

const DEFAULT_STAGE_LABEL = "Sem estágio";
const NO_PRIORITY_LABEL = "Sem prioridade";

function normalizePriority(value?: string | null) {
  if (!value) return NO_PRIORITY_LABEL;
  const raw = String(value).trim();
  if (!raw) return NO_PRIORITY_LABEL;

  const normalized = value.toLowerCase();
  if (normalized.includes("alta")) return "Alta";
  if (normalized.includes("m") && normalized.includes("dia")) return "Média";
  if (normalized.includes("baixa")) return "Baixa";
  return raw;
}

function isOverdue(note?: FullNoteLike) {
  const due = note?.due_date;
  if (!due) return false;

  const dueDate = new Date(due);
  if (Number.isNaN(dueDate.getTime())) return false;
  return dueDate.getTime() < Date.now();
}

function buildProjectStats(
  project: ProjectLike,
  notesById: Map<string, FullNoteLike>,
  currentUserId?: string
) {
  const notes = Array.isArray(project.notes) ? project.notes : [];
  const stages = Array.isArray(project.stages) ? project.stages : [];
  const stageMap = new Map(stages.map((stage) => [stage.id, stage.name]));

  const stageDistribution: Record<string, number> = {};
  const priorityDistribution: Record<string, number> = {
    [NO_PRIORITY_LABEL]: 0,
  };

  let notesWithoutCollaborators = 0;
  let myNotes = 0;
  let overdueNotes = 0;

  notes.forEach((note) => {
    const fullNote = note.id ? notesById.get(note.id) : undefined;

    const collaboratorsCount = Array.isArray(fullNote?.collaborators)
      ? fullNote.collaborators.length
      : undefined;
    if (collaboratorsCount === 0) notesWithoutCollaborators += 1;

    const ownerId = note.created_by?.user_id || fullNote?.author?.id || fullNote?.user_id;
    if (ownerId && ownerId === currentUserId) {
      myNotes += 1;
    }

    if (isOverdue(fullNote)) overdueNotes += 1;

    const stageLabel =
      (note.project_stage_id && stageMap.get(note.project_stage_id)) || DEFAULT_STAGE_LABEL;
    stageDistribution[stageLabel] = (stageDistribution[stageLabel] || 0) + 1;

    const priorityKey = normalizePriority(fullNote?.priority_name || fullNote?.properties?.priority);
    priorityDistribution[priorityKey] = (priorityDistribution[priorityKey] || 0) + 1;
  });

  return {
    id: project.id,
    title: project.title || "Projeto sem título",
    status: project.status || "open",
    color: project.properties?.color,
    totalNotes: notes.length,
    notesWithoutCollaborators,
    myNotes,
    overdueNotes,
    stageDistribution,
    priorityDistribution,
  };
}

const ProjectsOverview = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { projects, loading, createProject } = useProjects();
  const { notes } = useNotes();
  const [creating, setCreating] = useState(false);

  const notesById = useMemo(() => {
    const map = new Map<string, FullNoteLike>();
    notes.forEach((note) => {
      if (note?.id) map.set(note.id, note as FullNoteLike);
    });
    return map;
  }, [notes]);

  const projectStats = useMemo(() => {
    return (projects as ProjectLike[]).map((project) => buildProjectStats(project, notesById, user?.id));
  }, [projects, notesById, user?.id]);

  const globalStats = useMemo(() => {
    const initial = {
      totalProjects: projectStats.length,
      totalNotes: 0,
      notesWithoutCollaborators: 0,
      myNotes: 0,
      overdueNotes: 0,
      stageDistribution: {} as Record<string, number>,
      priorityDistribution: { [NO_PRIORITY_LABEL]: 0 } as Record<string, number>,
    };

    return projectStats.reduce((acc, stats) => {
      acc.totalNotes += stats.totalNotes;
      acc.notesWithoutCollaborators += stats.notesWithoutCollaborators;
      acc.myNotes += stats.myNotes;
      acc.overdueNotes += stats.overdueNotes;

      Object.entries(stats.stageDistribution).forEach(([stage, count]) => {
        acc.stageDistribution[stage] = (acc.stageDistribution[stage] || 0) + count;
      });

      Object.entries(stats.priorityDistribution).forEach(([priority, count]) => {
        acc.priorityDistribution[priority] = (acc.priorityDistribution[priority] || 0) + count;
      });

      return acc;
    }, initial);
  }, [projectStats]);

  const handleCreateProject = async () => {
    const title = window.prompt("Nome do novo projeto:");
    if (!title || !title.trim()) return;

    setCreating(true);
    try {
      const created = await createProject({
        title: title.trim(),
        status: "open",
        methodology: "kanban",
        default_view: "board",
      });
      if (created?.id) {
        router.push(`/app/projects/${created.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in flex flex-col gap-4 p-3 duration-300 sm:p-4">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div className="text-brand-primary-500 flex h-7 w-7 items-center justify-center rounded-md bg-yellow-400/10 dark:text-yellow-400">
          <BarChart2 className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
            Overview de Projetos
          </h1>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Dados rápidos gerais e por projeto
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateProject}
          disabled={creating}
          className="bg-brand-primary-500 inline-flex h-7 items-center gap-1 rounded px-2.5 text-[11px] font-semibold text-neutral-950 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {creating ? "Criando..." : "Criar projeto"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard
          icon={<Folder className="h-3.5 w-3.5" />}
          label="Projetos"
          value={globalStats.totalProjects}
          color="text-neutral-600 dark:text-neutral-300"
          bg="bg-neutral-100 dark:bg-neutral-800"
        />
        <StatCard
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Notas"
          value={globalStats.totalNotes}
          color="text-indigo-600 dark:text-indigo-400"
          bg="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatCard
          icon={<Users className="h-3.5 w-3.5" />}
          label="Sem colaboradores"
          value={globalStats.notesWithoutCollaborators}
          color="text-orange-600 dark:text-orange-400"
          bg="bg-orange-50 dark:bg-orange-900/20"
        />
        <StatCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Atrasadas"
          value={globalStats.overdueNotes}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-2 flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-[10px] font-bold tracking-wider text-neutral-500  dark:text-neutral-400">
              Minhas notas
            </span>
          </div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {globalStats.myNotes}
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              de {globalStats.totalNotes} no total
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-full rounded-full bg-blue-400 transition-all duration-500"
              style={{
                width: `${globalStats.totalNotes ? Math.min((globalStats.myNotes / globalStats.totalNotes) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-2 flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-[10px] font-bold tracking-wider text-neutral-500  dark:text-neutral-400">
              Por prioridade (geral)
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(globalStats.priorityDistribution).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-600 dark:text-neutral-400">{priority}</span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/30">
        <div className="mb-2.5 flex items-center gap-1.5">
          <Layers3 className="h-3.5 w-3.5 text-teal-500" />
          <span className="text-[10px] font-bold tracking-wider text-neutral-500  dark:text-neutral-400">
            Notas por estágio (geral)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Object.keys(globalStats.stageDistribution).length === 0 ? (
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Ainda sem notas associadas a estágios.
            </span>
          ) : (
            Object.entries(globalStats.stageDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([stage, count]) => (
                <NoteStatItem
                  key={stage}
                  label={stage}
                  value={count}
                  color="text-neutral-700 dark:text-neutral-200"
                />
              ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-neutral-200 pb-2 dark:border-neutral-800">
        <h2 className="text-xs font-semibold tracking-wider text-neutral-600  dark:text-neutral-300">
          Por projeto
        </h2>
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
          {projectStats.length} itens
        </span>
      </div>

      {projectStats.length === 0 && (
        <div className="rounded-md border border-dashed border-neutral-300 p-6 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum projeto ainda. Crie o primeiro para começar.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {projectStats.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => router.push(`/app/projects/${project.id}`)}
            className="w-full rounded-md border border-neutral-200 bg-white p-3 text-left transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color || "#a3a3a3" }}
                />
                <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {project.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
                  {statusLabels[project.status] || project.status}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </div>
            </div>

            <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <MiniStat label="Notas" value={project.totalNotes} />
              <MiniStat label="Sem colab." value={project.notesWithoutCollaborators} />
              <MiniStat label="Minhas" value={project.myNotes} />
              <MiniStat label="Atrasadas" value={project.overdueNotes} danger />
              <MiniStat label="Estágios" value={Object.keys(project.stageDistribution).length} />
            </div>

            <div className="grid grid-cols-1 gap-2 text-[10px] sm:grid-cols-2">
              <Distribution
                title="Estágios"
                items={project.stageDistribution}
                emptyLabel="Sem estágio"
                total={project.totalNotes}
              />
              <Distribution
                title="Prioridades"
                items={project.priorityDistribution}
                emptyLabel={NO_PRIORITY_LABEL}
                total={project.totalNotes}
              />
            </div>
          </button>
        ))}
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
        <span className="text-[10px] font-bold tracking-wider text-neutral-500  dark:text-neutral-400">
          {label}
        </span>
      </div>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function NoteStatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className={`text-base font-bold ${color}`}>{value}</span>
    </div>
  );
}

function MiniStat({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded border border-neutral-200 px-2 py-1 dark:border-neutral-800">
      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</p>
      <p
        className={`text-sm font-semibold ${
          danger ? "text-red-600 dark:text-red-400" : "text-neutral-800 dark:text-neutral-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Distribution({
  title,
  items,
  total,
  emptyLabel,
  mapLabel,
}: {
  title: string;
  items: Record<string, number>;
  total: number;
  emptyLabel: string;
  mapLabel?: (value: string) => string;
}) {
  const entries = Object.entries(items).filter(([, value]) => value > 0);

  if (entries.length === 0) {
    return (
      <div className="rounded border border-neutral-200 p-2 dark:border-neutral-800">
        <p className="mb-1 text-[10px] font-semibold tracking-wide text-neutral-500  dark:text-neutral-400">
          {title}
        </p>
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-neutral-200 p-2 dark:border-neutral-800">
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-neutral-500  dark:text-neutral-400">
        {title}
      </p>
      <div className="space-y-1">
        {entries
          .sort((a, b) => b[1] - a[1])
          .map(([label, value]) => {
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <span className="w-16 truncate text-neutral-500 dark:text-neutral-400">
                  {mapLabel ? mapLabel(label) : label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-neutral-500 dark:text-neutral-400">
                  {value}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default ProjectsOverview;
