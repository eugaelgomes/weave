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
  type Project,
  type CreateProjectData,
  type UpdateProjectData,
  type ProjectCollaborator,
  type ProjectNote,
  type ManageCollaboratorData,
  type ManageNoteData,
} from "../services/projects-service/ProjectsService";

// Tipos específicos do contexto
export interface ProjectOverview {
  id: string;
  title: string;
  description?: string;
  status: string;
  progress: number;
  notesCount: number;
  collaboratorsCount: number;
  color?: string;
  icon?: string;
  priority?: string;
  complexity?: string;
  estimatedTime?: string;
  lastModified: string;
}

export interface ProjectsStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  archivedProjects: number;
  totalNotes: number;
  averageProgress: number;
  statusDistribution: Record<string, number>;
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

  // Estado
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsOverview, setProjectsOverview] = useState<ProjectOverview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [refreshInterval] = useState<number>(10 * 60 * 1000); // 10 minutos

  // 1. BUSCAR PROJETOS (READ)
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const projectsData = await fetchProjectsService();

      setProjects(projectsData);

      // Versão resumida para overview/cards
      const overview: ProjectOverview[] = projectsData.map((project: Project) => ({
        id: project.id,
        title: project.title || "Projeto sem título",
        description: project.description,
        status: project.status || "ativo",
        progress: project.properties?.progress || 0,
        notesCount: Array.isArray(project.notes) ? project.notes.length : 0,
        collaboratorsCount: Array.isArray(project.collaborators)
          ? project.collaborators.filter((c) => !c.removed).length
          : 0,
        color: project.properties?.color,
        icon: project.properties?.icon,
        priority: project.properties?.priority,
        complexity: project.properties?.complexity,
        estimatedTime: project.properties?.estimated_time,
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

  // 1.1. REFRESH MANUAL DE PROJETOS
  const refreshProjects = useCallback(async () => {
    await fetchProjects();
  }, [fetchProjects]);

  // 1.2. BUSCAR PROJETO POR ID
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

  // 2. CRIAR PROJETO (CREATE)
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
    const activeProjects = projectsOverview.filter((p) => p.status === "ativo").length;
    const completedProjects = projectsOverview.filter((p) => p.status === "concluído").length;
    const archivedProjects = projectsOverview.filter((p) => p.status === "arquivado").length;
    const totalNotes = projectsOverview.reduce((acc, p) => acc + p.notesCount, 0);
    const averageProgress =
      totalProjects > 0
        ? Math.round(projectsOverview.reduce((acc, p) => acc + p.progress, 0) / totalProjects)
        : 0;

    const statusDistribution: Record<string, number> = {
      ativo: activeProjects,
      concluído: completedProjects,
      arquivado: archivedProjects,
    };

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      archivedProjects,
      totalNotes,
      averageProgress,
      statusDistribution,
    };
  }, [projectsOverview]);

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
    async (
      projectId: string,
      userId: string,
      permission: "admin" | "viewer"
    ): Promise<boolean> => {
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

  // Efeito para buscar dados inicialmente e configurar polling
  useEffect(() => {
    if (!user?.id) return;

    // Busca inicial apenas se não houver dados em cache
    if (projects.length === 0) {
      fetchProjects();
    }

    // Configurar polling automático
    const intervalId = setInterval(() => {
      fetchProjects();
    }, refreshInterval);

    // Cleanup
    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id, refreshInterval]); // Removido fetchProjects e projects das dependências

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
