"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useWeaveEngine } from "@/app/_contexts/weave-engine-context";
import type { ProjectNotesListFilters } from "@/app/_services/projects-service/projects-service";
import { fetchProjectReasonings } from "@/app/_services/projects-service/reasonings-service";
import { track } from "@vercel/analytics";
import { AlertTriangle, BrainCircuit, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import ProjectHeader from "@/app/(protected)/projects/_components/project-header";
import ProjectBoard from "@/app/(protected)/projects/_components/project-board-v2";
import AddCollaboratorModal from "@/app/(protected)/projects/_components/modals/add-collaborator-modal";
import AddNoteModal from "@/app/(protected)/projects/_components/modals/add-note-modal";
import { ProjectFilters } from "@/app/(protected)/projects/_components/project-filters";

export default function ProjectViewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.public_id as string;
  const { user } = useAuth();
  const { triggerReasoningNow } = useWeaveEngine();

  const {
    getProjectById,
    getMyProjectView,
    setMyProjectView,
    getCollaborators,
    getProjectNotes,
    getProjectStages,
    getProjectTags,
    getTaskPriorities,
    patchProjectTask,
  } = useProjects();

  const { notes } = useNotes();

  const [project, setProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [projectNotes, setProjectNotes] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [taskPriorities, setTaskPriorities] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"board" | "list">("board");
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [addTaskStageId, setAddTaskStageId] = useState<string | null>(null);
  const [addTaskParentNoteId, setAddTaskParentNoteId] = useState<string | null>(null);
  const [addTaskParentTitle, setAddTaskParentTitle] = useState<string | null>(null);

  const [noteFilters, setNoteFilters] = useState<ProjectNotesListFilters>({});
  const [engineSummary, setEngineSummary] = useState<{
    risk: "low" | "medium" | "high";
    actionItems: number;
    lastBriefingAt: string | null;
  }>({ risk: "low", actionItems: 0, lastBriefingAt: null });
  const [engineLoading, setEngineLoading] = useState(true);
  const filtersRef = useRef(noteFilters);
  filtersRef.current = noteFilters;

  const loadNotes = useCallback(
    async (filters?: ProjectNotesListFilters) => {
      try {
        const data = await getProjectNotes(projectId, filters);
        setProjectNotes(data);
      } catch {
        /* already logged in context */
      }
    },
    [projectId, getProjectNotes]
  );

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      setLoading(true);
      try {
        const [
          projectData,
          collabData,
          notesData,
          stagesData,
          tagsData,
          prioritiesData,
          viewPref,
        ] = await Promise.all([
          getProjectById(projectId),
          getCollaborators(projectId),
          getProjectNotes(projectId),
          getProjectStages(projectId).catch(() => []),
          getProjectTags(projectId).catch(() => []),
          getTaskPriorities(projectId).catch(() => []),
          getMyProjectView(projectId),
        ]);

        if (projectData) {
          setProject(projectData);
          setActiveView(viewPref);
        }
        setCollaborators(collabData);
        setProjectNotes(notesData);
        setStages(stagesData);
        setProjectTags(tagsData);
        setTaskPriorities(prioritiesData);
      } catch (error) {
        console.error("Failed to hydrate project context:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const loadEngineSummary = async () => {
      setEngineLoading(true);
      try {
        const reasonings = await fetchProjectReasonings(projectId, { limit: 6 });
        const hasHigh = reasonings.some((item) => item.safety_label === "unsafe");
        const hasMedium = reasonings.some((item) => item.safety_label === "review");
        const actionItems = reasonings.reduce(
          (acc, item) => acc + (item.action_items_count || 0),
          0
        );
        setEngineSummary({
          risk: hasHigh ? "high" : hasMedium ? "medium" : "low",
          actionItems,
          lastBriefingAt: reasonings[0]?.created_at || null,
        });
      } finally {
        setEngineLoading(false);
      }
    };
    void loadEngineSummary();
  }, [projectId]);

  const handleFiltersChange = useCallback(
    (next: ProjectNotesListFilters) => {
      setNoteFilters(next);
      void loadNotes(next);
    },
    [loadNotes]
  );

  const handleFiltersClear = useCallback(() => {
    setNoteFilters({});
    void loadNotes({});
  }, [loadNotes]);

  const refetchNotes = useCallback(() => {
    void loadNotes(filtersRef.current);
  }, [loadNotes]);

  const isOwner = project?.user_id === user?.id;
  const canEdit =
    isOwner ||
    collaborators.some((c: any) => c.user_id === user?.id && c.permission === "admin");

  const enrichedProjectNotes = useMemo(() => {
    return projectNotes.map((projectNote: any) => {
      const fullNote = notes.find((note) => note.id === projectNote.id);
      if (!fullNote) return projectNote;
      return {
        ...projectNote,
        description: fullNote.description ?? projectNote.description,
        preview: fullNote.preview ?? projectNote.preview,
        properties: fullNote.properties ?? projectNote.properties,
        priority_id: fullNote.priority_id ?? projectNote.priority_id,
        due_date: fullNote.due_date ?? projectNote.due_date,
        tags: fullNote.tags ?? projectNote.tags,
        parent_id: fullNote.parent_id ?? projectNote.parent_id ?? null,
      };
    });
  }, [notes, projectNotes]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <div className="border-primary-500 h-6 w-6 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white dark:bg-[#1d1d1b]">
      <ProjectHeader
        project={project}
        stagesCount={stages.length}
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          void setMyProjectView(projectId, v);
        }}
        onViewDetails={() => router.push(`/projects/${projectId}/details`)}
        onBack={() => router.push("/projects")}
      />

      <ProjectFilters
        stages={stages}
        projectTags={projectTags}
        taskPriorities={taskPriorities}
        collaborators={collaborators}
        filters={noteFilters}
        onChange={handleFiltersChange}
        onClear={handleFiltersClear}
      />

      <section className="mx-2 mb-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-[11px] shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-semibold text-neutral-800 dark:text-neutral-200">
              <BrainCircuit className="h-3.5 w-3.5" />
              Weave Engine
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 font-semibold ${
                engineSummary.risk === "high"
                  ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300"
                  : engineSummary.risk === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              }`}
            >
              Risco {engineSummary.risk === "high" ? "Alto" : engineSummary.risk === "medium" ? "Médio" : "Baixo"}
            </span>
            <span className="inline-flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
              <Sparkles className="h-3 w-3" />
              {engineSummary.actionItems} ações sugeridas
            </span>
            <span className="text-neutral-500 dark:text-neutral-400">
              {engineLoading
                ? "Carregando insights..."
                : `Último briefing: ${
                    engineSummary.lastBriefingAt
                      ? new Date(engineSummary.lastBriefingAt).toLocaleString()
                      : "sem briefing"
                  }`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await triggerReasoningNow(projectId, { reasoningType: "analysis" });
                  track("weave_engine_generate_briefing", {
                    source: "project_page",
                    projectId,
                  });
                  toast.success("Solicitação enviada para o Weave Engine.");
                } catch (error) {
                  toast.error("Não foi possível gerar briefing agora.", {
                    description: error instanceof Error ? error.message : "Erro inesperado.",
                  });
                }
              }}
              className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-200"
            >
              <BrainCircuit className="h-3.5 w-3.5" />
              Gerar briefing
            </button>
            <Link
              href={`/weave-engine?projectId=${projectId}&view=risks`}
              className="inline-flex items-center gap-1 rounded-md bg-brand-primary-500 px-2 py-1 text-[11px] font-semibold text-neutral-900 hover:brightness-95"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Centro de riscos
            </Link>
          </div>
        </div>
      </section>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-white shadow-sm dark:bg-[#1d1d1b]/50 dark:shadow-surface-dark-sm">
            {activeView === "board" && (
              <ProjectBoard
                stages={stages}
                projectNotes={enrichedProjectNotes}
                projectTags={projectTags}
                taskPriorities={taskPriorities}
                onAddCard={canEdit ? (stageId) => {
                  setAddTaskStageId(stageId);
                  setAddTaskParentNoteId(null);
                  setAddTaskParentTitle(null);
                  setShowAddNote(true);
                } : undefined}
                onAddSubtask={
                  canEdit
                    ? (parentNoteId, stageId, parentTitle) => {
                        setAddTaskStageId(stageId);
                        setAddTaskParentNoteId(parentNoteId);
                        setAddTaskParentTitle(parentTitle ?? null);
                        setShowAddNote(true);
                      }
                    : undefined
                }
                onProjectNotesReplaced={(next) => setProjectNotes(next)}
                onPatchTask={
                  canEdit
                    ? async (noteId, taskData) => {
                        await patchProjectTask(projectId, noteId, taskData);
                        refetchNotes();
                      }
                    : undefined
                }
                onNoteStageChange={(noteId, newStageId) => {
                  setProjectNotes((prev) =>
                    prev.map((n) =>
                      n.id === noteId ? { ...n, project_stage_id: newStageId } : n
                    )
                  );
                }}
              />
            )}
            {activeView === "list" && (
              <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
                <p className="font-medium text-neutral-700 dark:text-neutral-200">Vista em lista</p>
                <p className="max-w-sm">
                  A vista em lista está em construção. Use o quadro (Board) para gerir tarefas por
                  coluna.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {showAddCollaborator && (
        <AddCollaboratorModal
          projectId={projectId}
          currentCollaborators={collaborators}
          onClose={() => setShowAddCollaborator(false)}
          onSuccess={(updatedCollabs) => setCollaborators(updatedCollabs)}
        />
      )}

      {showAddNote && (
        <AddNoteModal
          projectId={projectId}
          stageId={addTaskStageId}
          parentNoteId={addTaskParentNoteId}
          parentTitle={addTaskParentTitle}
          projectTags={projectTags}
          projectCollaborators={collaborators}
          taskPriorities={taskPriorities}
          onClose={() => {
            setShowAddNote(false);
            setAddTaskStageId(null);
            setAddTaskParentNoteId(null);
            setAddTaskParentTitle(null);
          }}
          onSuccess={() => {
            refetchNotes();
            setShowAddNote(false);
            setAddTaskStageId(null);
            setAddTaskParentNoteId(null);
            setAddTaskParentTitle(null);
          }}
        />
      )}
    </div>
  );
}
