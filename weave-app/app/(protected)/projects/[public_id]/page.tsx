"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useAuth } from "@/app/_contexts/auth-context";

// Componentes importados (idealmente separados em seus próprios arquivos)
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

  // Estados Globais do Projeto
  const [project, setProject] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [projectNotes, setProjectNotes] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [taskPriorities, setTaskPriorities] = useState<any[]>([]);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"board" | "list">("board");
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [addTaskStageId, setAddTaskStageId] = useState<string | null>(null);
  const [addTaskParentNoteId, setAddTaskParentNoteId] = useState<string | null>(null);
  const [addTaskParentTitle, setAddTaskParentTitle] = useState<string | null>(null);

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

  const isOwner = project?.user_id === user?.id;
  const canEdit =
    isOwner ||
    collaborators.some((c) => c.user_id === user?.id && c.permission === "admin");

  const enrichedProjectNotes = useMemo(() => {
    return projectNotes.map((projectNote) => {
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
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-neutral-50 dark:bg-[#0E0E11]">
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

      <ProjectFilters />

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
                        const updatedNotes = await patchProjectTask(projectId, noteId, taskData);
                        setProjectNotes(updatedNotes);
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
          onSuccess={(updatedNotes) => {
            setProjectNotes(updatedNotes);
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
