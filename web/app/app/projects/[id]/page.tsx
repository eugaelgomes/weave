"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjects } from "@/app/_contexts/projects-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useAuth } from "@/app/_contexts/auth-context";

// Componentes importados (idealmente separados em seus próprios arquivos)
import ProjectHeader from "@/app/app/projects/_components/project-header";
import ProjectBoard from "@/app/app/projects/_components/project-board";
import ProjectSidebar from "@/app/app/projects/_components/project-sidebar";
import ProjectEditor from "@/app/app/projects/_components/project-editor";
import AddCollaboratorModal from "@/app/app/projects/_components/modals/add-collaborator-modal";
import AddNoteModal from "@/app/app/projects/_components/modals/add-note-modal";
import { ProjectFilters } from "@/app/app/projects/_components/project-filters";

export default function ProjectViewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const { user } = useAuth();

  const {
    getProjectById,
    getCollaborators,
    getProjectNotes,
    getProjectStages,
    getProjectTags,
    getTaskPriorities,
    deleteProject,
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
  const [isEditing, setIsEditing] = useState(false);
  const [activeView, setActiveView] = useState<
    "board" | "list" | "calendar" | "timeline" | "gantt"
  >("board");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAddCollaborator, setShowAddCollaborator] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      setLoading(true);
      try {
        const [projectData, collabData, notesData, stagesData, tagsData, prioritiesData] =
          await Promise.all([
            getProjectById(projectId),
            getCollaborators(projectId),
            getProjectNotes(projectId),
            getProjectStages(projectId).catch(() => []),
            getProjectTags(projectId).catch(() => []),
            getTaskPriorities(projectId).catch(() => []),
          ]);

        if (projectData) {
          setProject(projectData);
          setActiveView(projectData.default_view || "board");
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <div className="border-primary-500 h-6 w-6 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  if (!project) return null;

  const isOwner = project.user_id === user?.id;
  const canEdit =
    isOwner || collaborators.some((c) => c.user_id === user?.id && c.permission === "admin");

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#FAFAFA] dark:bg-[#0E0E11]">
      <ProjectHeader
        project={project}
        stagesCount={stages.length}
        activeView={activeView}
        setActiveView={setActiveView}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        canEdit={canEdit}
        isOwner={isOwner}
        onDelete={() => deleteProject(projectId).then(() => router.push("/app/projects"))}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onBack={() => router.push("/app/projects")}
      />

      <ProjectFilters />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isEditing && (
            <ProjectEditor
              project={project}
              onClose={() => setIsEditing(false)}
              onSave={(updatedProject: any) => {
                setProject(updatedProject);
                setIsEditing(false);
              }}
            />
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white shadow-sm dark:bg-neutral-900/50">
            {activeView === "board" && (
              <ProjectBoard stages={stages} projectNotes={projectNotes} projectTags={projectTags} />
            )}
            {/* Outras visualizações (List, Timeline) entrariam aqui */}
          </div>
        </main>

        <ProjectSidebar
          isOpen={showSidebar}
          project={project}
          tags={projectTags}
          priorities={taskPriorities}
          collaborators={collaborators}
          notes={projectNotes}
          isOwner={isOwner}
          canEdit={canEdit}
          onClose={() => setShowSidebar(false)}
          onAddCollaborator={() => setShowAddCollaborator(true)}
          onAddNote={() => setShowAddNote(true)}
        />
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
          existingNotes={projectNotes}
          allUserNotes={notes}
          onClose={() => setShowAddNote(false)}
          onSuccess={(updatedNotes) => setProjectNotes(updatedNotes)}
        />
      )}
    </div>
  );
}
