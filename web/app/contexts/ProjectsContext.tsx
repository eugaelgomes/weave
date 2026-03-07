"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  fetchProjects as fetchProjectsService,
  fetchProjectById as fetchProjectByIdService,
  createProject as createProjectService,
  updateProject as updateProjectService,
  deleteProject as deleteProjectService,
  fetchProjectCollaborators as fetchProjectCollaboratorsService,
  manageCollaborator as manageCollaboratorService,
  fetchProjectNotes as fetchProjectNotesService,
  manageProjectNote as manageProjectNoteService,
  fetchProjectStages as fetchProjectStagesService,
  type Project,
  type CreateProjectData,
  type UpdateProjectData,
  type ProjectCollaborator,
  type ProjectNote,
  type ProjectStage,
  type ManageCollaboratorData,
  type ManageNoteData,
} from "../services/projects-service/ProjectsService";

// Tipos específicos do contexto / Overview
export interface ProjectOverview {
  id: string;
  title: string;
  description?: string;
  status: string;
  methodology: string;
  default_view: string;
  progress: number;
  notesCount: number;
  collaboratorsCount: number;
  color?: string;
  icon?: string;
  priority?: string;
  complexity?: string;
  estimatedTime?: string;
  tags?: string[];
  lastModified: string;
}

export interface ProjectsStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  archivedProjects: number;
  totalNotes: number;
  totalCollaborators: number;
  averageProgress: number;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  complexityDistribution: Record<string, number>;
  projectsWithDeadline: number;
  mostCollaborativeProject?: { title: string; count: number };
  mostActiveProject?: { title: string; count: number };
}

export interface ProjectsContextType {
  // Estado
  projects: Project[];
  projectsOverview: ProjectOverview[];
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  refreshInterval: number;

  // Funções de projetos
  fetchProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  getProjectById: (projectId: string) => Promise<Project | null>;
  createProject: (projectData: CreateProjectData) => Promise<Project | null>;
  updateProject: (projectId: string, projectData: UpdateProjectData) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;

  // Funções de dados derivados
  getRecentProjects: () => ProjectOverview[];
  getProjectsByStatus: (status: string) => ProjectOverview[];
  getProjectsStats: () => ProjectsStats;

  // tages
  getProjectStages: (projectId: string) => Promise<ProjectStage[]>;

  // Funções de colaboradores
  getCollaborators: (projectId: string) => Promise<ProjectCollaborator[]>;
  addCollaborator: (
    projectId: string,
    userId: string,
    permission?: "admin" | "viewer"
  ) => Promise<boolean>;
  updateCollaboratorPermission: (
    projectId: string,
    userId: string,
    permission: "admin" | "viewer"
  ) => Promise<boolean>;
  removeCollaborator: (projectId: string, userId: string) => Promise<boolean>;

  // Funções de notas
  getProjectNotes: (projectId: string) => Promise<ProjectNote[]>;
  addNoteToProject: (projectId: string, noteId: string) => Promise<boolean>;
  syncProjectNote: (projectId: string, noteId: string) => Promise<boolean>;
  removeNoteFromProject: (projectId: string, noteId: string) => Promise<boolean>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function useProjects(): ProjectsContextType {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects deve ser usado dentro de um ProjectsProvider");
  }
  return context;
}

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // Estados
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsOverview, setProjectsOverview] = useState<ProjectOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [refreshInterval] = useState<number>(10 * 60 * 1000); // 10 minutos

  // Get Projects
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const projectsData = await fetchProjectsService();

      setProjects(projectsData);

      const overview: ProjectOverview[] = projectsData.map((project: Project) => ({
        id: project.id,
        title: project.title || "Projeto sem título",
        description: project.description,
        status: project.status || "open",
        methodology: project.methodology || "kanban",
        default_view: project.default_view || "board",
        progress: project.properties?.progress || 0,
        notesCount: Array.isArray(project.notes) ? project.notes.length : 0,
        collaboratorsCount: Array.isArray(project.collaborators)
          ? project.collaborators.filter((c) => !c.removed).length
          : 0,
        color: project.properties?.color ?? undefined,
        icon: project.properties?.icon ?? undefined,
        priority: project.properties?.priority ?? undefined,
        complexity: project.properties?.complexity ?? undefined,
        estimatedTime: project.properties?.estimated_time ?? undefined,
        tags: project.properties?.tags ?? undefined,
        lastModified: project.updated_at || project.created_at,
      }));

      setProjectsOverview(overview);
      setLastFetch(new Date());
    } catch (err: unknown) {
      console.error("Erro ao buscar projetos:", err);
      setError(err instanceof Error ? err.message : "Erro ao buscar projetos");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshProjects = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  const getProjectById = useCallback(
    async (projectId: string): Promise<Project | null> => {
      if (!user?.id || !projectId) return null;

      try {
        const projectData = await fetchProjectByIdService(projectId);
        return projectData;
      } catch (err: unknown) {
        console.error("Erro ao buscar projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // 2. Create Project
  const createProject = useCallback(
    async (projectData: CreateProjectData): Promise<Project | null> => {
      if (!user?.id) return null;

      setLoading(true);
      setError(null);

      try {
        const newProject = await createProjectService(projectData);
        await fetchProjects(); // Atualiza a lista inteira após criar
        return newProject;
      } catch (err: unknown) {
        console.error("Erro ao criar projeto:", err);
        setError(err instanceof Error ? err.message : "Erro ao criar projeto");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchProjects]
  );

  // 3. ATUALIZAR PROJETO (UPDATE)
  const updateProject = useCallback(
    async (projectId: string, projectData: UpdateProjectData): Promise<Project | null> => {
      if (!user?.id) return null;

      setLoading(true);
      setError(null);

      try {
        const updatedProject = await updateProjectService(projectId, projectData);
        await fetchProjects(); // Atualiza a lista para refletir a mudança
        return updatedProject;
      } catch (err: unknown) {
        console.error("Erro ao atualizar projeto:", err);
        setError(err instanceof Error ? err.message : "Erro ao atualizar projeto");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchProjects]
  );

  // 4. DELETAR PROJETO (DELETE)
  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (!user?.id) return false;

      setLoading(true);
      setError(null);

      try {
        await deleteProjectService(projectId);
        await fetchProjects(); // Atualiza a lista após a exclusão
        return true;
      } catch (err: unknown) {
        console.error("Erro ao deletar projeto:", err);
        setError(err instanceof Error ? err.message : "Erro ao deletar projeto");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user?.id, fetchProjects]
  );

  // --- DADOS DERIVADOS ---

  const getRecentProjects = useCallback((): ProjectOverview[] => {
    return projectsOverview
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, 6);
  }, [projectsOverview]);

  const getProjectsByStatus = useCallback(
    (status: string): ProjectOverview[] => {
      if (!status) return projectsOverview;
      return projectsOverview.filter((project) => project.status === status);
    },
    [projectsOverview]
  );

  const getProjectsStats = useCallback((): ProjectsStats => {
    const totalProjects = projectsOverview.length;
    const openProjects = projectsOverview.filter((p) => p.status === "open").length;
    const inProgressProjects = projectsOverview.filter((p) => p.status === "in_progress").length;
    const completedProjects = projectsOverview.filter((p) => p.status === "completed").length;
    const pausedProjects = projectsOverview.filter((p) => p.status === "paused").length;
    const archivedProjects = projectsOverview.filter((p) => p.status === "archived").length;
    const activeProjects = openProjects + inProgressProjects;
    const totalNotes = projectsOverview.reduce((acc, p) => acc + p.notesCount, 0);
    const totalCollaborators = projectsOverview.reduce((acc, p) => acc + p.collaboratorsCount, 0);
    const averageProgress =
      totalProjects > 0
        ? Math.round(projectsOverview.reduce((acc, p) => acc + p.progress, 0) / totalProjects)
        : 0;

    const statusDistribution: Record<string, number> = {
      open: openProjects,
      in_progress: inProgressProjects,
      completed: completedProjects,
      paused: pausedProjects,
      archived: archivedProjects,
    };

    const priorityDistribution: Record<string, number> = {
      alta: projectsOverview.filter((p) => p.priority === "alta").length,
      media: projectsOverview.filter((p) => p.priority === "media").length,
      baixa: projectsOverview.filter((p) => p.priority === "baixa").length,
    };

    const complexityDistribution: Record<string, number> = {
      alta: projectsOverview.filter((p) => p.complexity === "alta").length,
      media: projectsOverview.filter((p) => p.complexity === "media").length,
      baixa: projectsOverview.filter((p) => p.complexity === "baixa").length,
    };

    const projectsWithDeadline = projectsOverview.filter((p) => p.estimatedTime).length;

    const mostCollaborative = projectsOverview.reduce(
      (max, p) =>
        p.collaboratorsCount > (max?.count || 0)
          ? { title: p.title, count: p.collaboratorsCount }
          : max,
      undefined as { title: string; count: number } | undefined
    );

    const mostActive = projectsOverview.reduce(
      (max, p) =>
        p.notesCount > (max?.count || 0) ? { title: p.title, count: p.notesCount } : max,
      undefined as { title: string; count: number } | undefined
    );

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      archivedProjects,
      totalNotes,
      totalCollaborators,
      averageProgress,
      statusDistribution,
      priorityDistribution,
      complexityDistribution,
      projectsWithDeadline,
      mostCollaborativeProject: mostCollaborative?.count ? mostCollaborative : undefined,
      mostActiveProject: mostActive?.count ? mostActive : undefined,
    };
  }, [projectsOverview]);

  // 🟢 NOVO: STAGES / COLUNAS DO BOARD
  const getProjectStages = useCallback(
    async (projectId: string): Promise<ProjectStage[]> => {
      if (!user?.id) return [];

      try {
        const stages = await fetchProjectStagesService(projectId);
        return stages;
      } catch (err: unknown) {
        console.error("Erro ao buscar as etapas do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // --- FUNÇÕES DE COLABORADORES ---

  const getCollaborators = useCallback(
    async (projectId: string): Promise<ProjectCollaborator[]> => {
      if (!user?.id) return [];

      try {
        const collaborators = await fetchProjectCollaboratorsService(projectId);
        return collaborators;
      } catch (err: unknown) {
        console.error("Erro ao buscar colaboradores:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const addCollaborator = useCallback(
    async (
      projectId: string,
      userId: string,
      permission: "admin" | "viewer" = "viewer"
    ): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const data: ManageCollaboratorData = {
          action: "add",
          userId,
          permission,
        };
        await manageCollaboratorService(projectId, data);
        await fetchProjects(); // Atualiza a lista
        return true;
      } catch (err: unknown) {
        console.error("Erro ao adicionar colaborador:", err);
        throw err;
      }
    },
    [user?.id, fetchProjects]
  );

  const updateCollaboratorPermission = useCallback(
    async (projectId: string, userId: string, permission: "admin" | "viewer"): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const data: ManageCollaboratorData = {
          action: "update",
          userId,
          permission,
        };
        await manageCollaboratorService(projectId, data);
        await fetchProjects(); // Atualiza a lista
        return true;
      } catch (err: unknown) {
        console.error("Erro ao atualizar permissão:", err);
        throw err;
      }
    },
    [user?.id, fetchProjects]
  );

  const removeCollaborator = useCallback(
    async (projectId: string, userId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const data: ManageCollaboratorData = {
          action: "remove",
          userId,
        };
        await manageCollaboratorService(projectId, data);
        await fetchProjects(); // Atualiza a lista
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover colaborador:", err);
        throw err;
      }
    },
    [user?.id, fetchProjects]
  );

  // --- FUNÇÕES DE NOTAS ---

  const getProjectNotes = useCallback(
    async (projectId: string): Promise<ProjectNote[]> => {
      if (!user?.id) return [];

      try {
        const notes = await fetchProjectNotesService(projectId);
        return notes;
      } catch (err: unknown) {
        console.error("Erro ao buscar notas do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const addNoteToProject = useCallback(
    async (projectId: string, noteId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const data: ManageNoteData = {
          action: "add",
          noteId,
        };
        await manageProjectNoteService(projectId, data);
        await fetchProjects(); // Atualiza a lista
        return true;
      } catch (err: unknown) {
        console.error("Erro ao adicionar nota ao projeto:", err);
        throw err;
      }
    },
    [user?.id, fetchProjects]
  );

  const syncProjectNote = useCallback(
    async (projectId: string, noteId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const data: ManageNoteData = {
          action: "sync",
          noteId,
        };
        await manageProjectNoteService(projectId, data);
        await fetchProjects(); // Atualiza a lista
        return true;
      } catch (err: unknown) {
        console.error("Erro ao sincronizar nota:", err);
        throw err;
      }
    },
    [user?.id, fetchProjects]
  );

  const removeNoteFromProject = useCallback(
    async (projectId: string, noteId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const data: ManageNoteData = {
          action: "remove",
          noteId,
        };
        await manageProjectNoteService(projectId, data);
        await fetchProjects(); // Atualiza a lista
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover nota do projeto:", err);
        throw err;
      }
    },
    [user?.id, fetchProjects]
  );

  useEffect(() => {
    if (!user?.id) return;

    if (projects.length === 0) {
      fetchProjects();
    }

    const intervalId = setInterval(() => {
      fetchProjects();
    }, refreshInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id, refreshInterval, fetchProjects, projects.length]);

  const value: ProjectsContextType = {
    projects,
    projectsOverview,
    loading,
    error,
    lastFetch,
    refreshInterval,
    fetchProjects,
    refreshProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    getRecentProjects,
    getProjectsByStatus,
    getProjectsStats,
    getProjectStages,
    getCollaborators,
    addCollaborator,
    updateCollaboratorPermission,
    removeCollaborator,
    getProjectNotes,
    addNoteToProject,
    syncProjectNote,
    removeNoteFromProject,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export default ProjectsContext;