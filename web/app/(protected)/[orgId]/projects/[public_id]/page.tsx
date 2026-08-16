"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useAuth } from "@/app/_contexts/auth-context";
import type { ProjectNotesListFilters } from "@/app/_services/projects-service/projects-service";
import { updateProject as updateProjectService } from "@/app/_services/projects-service/projects-service";

import ProjectHeader from "@/app/(protected)/projects/_components/project-header";
import ProjectBoard from "@/app/(protected)/projects/_components/project-board-v2";
import AddCollaboratorModal from "@/app/(protected)/projects/_components/modals/add-collaborator-modal";
import { ProjectFilters } from "@/app/(protected)/projects/_components/project-filters";
import { useTaskNoteModal } from "@/app/(protected)/_components/task-note-modal";

export default function ProjectViewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.public_id as string;
  
  const { user } = useAuth();

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
    refreshProjects,
  } = useProjects();

  const { notes } = useNotes();
  const { openModal: openTaskNoteModal } = useTaskNoteModal();

  const [project, setProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [projectNotes, setProjectNotes] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [taskPriorities, setTaskPriorities] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"board" | "list">("board");
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);

  const [noteFilters, setNoteFilters] = useState<ProjectNotesListFilters>({});
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
        const [projectData, collabData, notesData, stagesData, tagsData, prioritiesData, viewPref] =
          await Promise.all([
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

  const openCreateTaskModal = useCallback(
    (stageId: string, parentNoteId?: string | null) => {
      openTaskNoteModal("create", {
        projectId,
        projectPublicId: project?.public_id || projectId,
        stageId,
        parentNoteId: parentNoteId ?? undefined,
        onNoteCreated: () => {
          refetchNotes();
        },
      });
    },
    [openTaskNoteModal, projectId, project?.public_id, refetchNotes]
  );

  const handleProjectIconChange = useCallback(
    async (file: File) => {
      if (!project?.id) return;
      try {
        const fd = new FormData();
        fd.append("icon", file);
        const updated = await updateProjectService(project.id, fd);
        if (updated) {
          setProject(updated);
          await refreshProjects();
        }
      } catch (error) {
        console.error("Erro ao atualizar ícone do projeto:", error);
      }
    },
    [project, refreshProjects]
  );

  const isOwner = project?.user_id === user?.id;
  const canEdit =
    isOwner || collaborators.some((c: any) => c.user_id === user?.id && c.permission === "admin");

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
        onBack={() => router.push(`/projects`)}
        canEdit={canEdit}
        onIconFile={canEdit ? handleProjectIconChange : undefined}
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

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="dark:shadow-surface-dark-sm flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-white shadow-sm dark:bg-[#1d1d1b]/50">
            {activeView === "board" && (
              <ProjectBoard
                stages={stages}
                projectNotes={enrichedProjectNotes}
                projectPublicId={project?.public_id || projectId}
                projectTags={projectTags}
                projectCollaborators={collaborators}
                taskPriorities={taskPriorities}
                onAddCard={canEdit ? (stageId) => openCreateTaskModal(stageId) : undefined}
                onAddSubtask={
                  canEdit
                    ? (parentNoteId, stageId) => openCreateTaskModal(stageId, parentNoteId)
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
                    prev.map((n) => (n.id === noteId ? { ...n, project_stage_id: newStageId } : n))
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
    </div>
  );
}
