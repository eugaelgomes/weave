"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./auth-context";
import {
  fetchProjects as fetchProjectsService,
  fetchProjectById as fetchProjectByIdService,
  getMyProjectView as getMyProjectViewService,
  setMyProjectView as setMyProjectViewService,
  createProject as createProjectService,
  updateProject as updateProjectService,
  deleteProject as deleteProjectService,
  deleteProjectStage as deleteProjectStageService,
  patchProjectStage as patchProjectStageService,
  fetchProjectCollaborators as fetchProjectCollaboratorsService,
  manageCollaborator as manageCollaboratorService,
  postProjectCollaborator as postProjectCollaboratorService,
  fetchProjectNotes as fetchProjectNotesService,
  manageProjectNote as manageProjectNoteService,
  fetchProjectStages as fetchProjectStagesService,
  updateProjectNoteStage as updateProjectNoteStageService,
  fetchProjectsStats as fetchProjectsStatsService,
  fetchAiReportConfig as fetchAiReportConfigService,
  putProjectAiReportConfig as putProjectAiReportConfigService,
  fetchSprints as fetchSprintsService,
  fetchActiveSprint as fetchActiveSprintService,
  createSprint as createSprintService,
  completeSprint as completeSprintService,
  fetchReasonings as fetchReasoningsService,
  fetchReasoningById as fetchReasoningByIdService,
  fetchReasoningActionItems as fetchReasoningActionItemsService,
  createReasoning as createReasoningService,
  updateReasoningInteraction as updateReasoningInteractionService,
  updateReasoningActionItem as updateReasoningActionItemService,
  type Project,
  type SubProject,
  type CreateProjectData,
  type UpdateProjectData,
  type ProjectCollaborator,
  type ProjectNote,
  type ProjectStage,
  type PatchProjectStagePayload,
  type ManageCollaboratorData,
  type ManageNoteData,
  type ProjectDashboardStats,
  type ProjectStatsFilters,
  type AiReportConfig,
  type AiReportConfigUpsertPayload,
  type PostProjectCollaboratorPayload,
  type Sprint,
  type CreateSprintPayload,
  type CompleteSprintPayload,
  type Reasoning,
  type ReasoningActionItem,
  type CreateReasoningPayload,
  type UpdateReasoningInteractionPayload,
  type UpdateReasoningActionItemPayload,
} from "../_services/projects-service/projects-service";
import {
  fetchProjectTags as fetchProjectTagsService,
  createProjectTag as createProjectTagService,
  updateProjectTag as updateProjectTagService,
  deleteProjectTag as deleteProjectTagService,
  fetchTaskPriorities as fetchTaskPrioritiesService,
  fetchOrgTaskPriorities as fetchOrgTaskPrioritiesService,
  createTaskPriority as createTaskPriorityService,
  updateTaskPriority as updateTaskPriorityService,
  deleteTaskPriority as deleteTaskPriorityService,
  type ProjectTag,
  type TaskPriority,
  type CreateProjectTagData,
  type UpdateProjectTagData,
  type CreateTaskPriorityData,
  type UpdateTaskPriorityData,
} from "../_services/projects-service/project-taxonomy-service";
import { PROJECT_STATUS } from "@/app/_utils/db-enums";

// Tipos específicos do contexto / Overview
export type {
  Project,
  ProjectStage,
  CreateProjectData,
} from "../_services/projects-service/projects-service";
export type { ProjectDashboardStats, ProjectStatsFilters };
export type {
  AiReportConfig,
  AiReportConfigUpsertPayload,
  Sprint,
  CreateSprintPayload,
  CompleteSprintPayload,
  Reasoning,
  ReasoningActionItem,
  CreateReasoningPayload,
  UpdateReasoningInteractionPayload,
  UpdateReasoningActionItemPayload,
};
export type {
  ProjectTag,
  TaskPriority,
  CreateProjectTagData,
  UpdateProjectTagData,
  CreateTaskPriorityData,
  UpdateTaskPriorityData,
};

export interface ProjectOverview {
  id: string;
  title: string;
  description?: string;
  status: string;
  methodology: string;
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
  subprojects?: SubProject[];
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
  projectsStats: ProjectDashboardStats | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
  refreshInterval: number;

  // Funções de projetos
  fetchProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  getProjectById: (projectId: string) => Promise<Project | null>;
  getMyProjectView: (projectId: string) => Promise<"board" | "list">;
  setMyProjectView: (projectId: string, view: "board" | "list") => Promise<"board" | "list">;
  createProject: (projectData: CreateProjectData) => Promise<Project | null>;
  updateProject: (
    projectId: string,
    projectData: UpdateProjectData | FormData
  ) => Promise<Project | null>;
  deleteProject: (projectId: string) => Promise<boolean>;

  // Funções de dados derivados
  getRecentProjects: () => ProjectOverview[];
  getProjectsByStatus: (status: string) => ProjectOverview[];
  getProjectsStats: () => ProjectsStats;
  fetchProjectsStats: (filters?: ProjectStatsFilters) => Promise<void>;

  // tages
  getProjectStages: (projectId: string) => Promise<ProjectStage[]>;
  patchProjectStage: (
    projectId: string,
    stageId: string,
    updates: PatchProjectStagePayload
  ) => Promise<ProjectStage | null>;

  // Taxonomia de projeto (tags e prioridades)
  getProjectTags: (projectId: string) => Promise<ProjectTag[]>;
  createProjectTag: (projectId: string, data: CreateProjectTagData) => Promise<ProjectTag | null>;
  updateProjectTag: (
    projectId: string,
    tagId: string,
    data: UpdateProjectTagData
  ) => Promise<ProjectTag | null>;
  deleteProjectTag: (projectId: string, tagId: string) => Promise<boolean>;
  getTaskPriorities: (projectId: string) => Promise<TaskPriority[]>;
  getOrgTaskPriorities: (organizationId: string) => Promise<TaskPriority[]>;
  createTaskPriority: (
    projectId: string,
    data: CreateTaskPriorityData
  ) => Promise<TaskPriority | null>;
  updateTaskPriority: (
    projectId: string,
    priorityId: string,
    data: UpdateTaskPriorityData
  ) => Promise<TaskPriority | null>;
  deleteTaskPriority: (projectId: string, priorityId: string) => Promise<boolean>;

  // Funções de colaboradores
  getCollaborators: (projectId: string) => Promise<ProjectCollaborator[]>;
  postProjectCollaborator: (
    projectId: string,
    payload: PostProjectCollaboratorPayload
  ) => Promise<boolean>;
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

  // Funções de tarefas
  getProjectNotes: (projectId: string) => Promise<ProjectNote[]>;
  addNoteToProject: (projectId: string, noteId: string) => Promise<boolean>;
  syncProjectNote: (projectId: string, noteId: string) => Promise<boolean>;
  removeNoteFromProject: (projectId: string, noteId: string) => Promise<boolean>;
  updateProjectNoteStage: (projectId: string, noteId: string, stageId: string) => Promise<void>;

  // Stage delete
  deleteProjectStage: (projectId: string, stageId: string) => Promise<boolean>;

  // AI Report Config
  getAiReportConfig: (projectId: string) => Promise<AiReportConfig | null>;
  updateAiReportConfig: (projectId: string, payload: AiReportConfigUpsertPayload) => Promise<boolean>;

  // Sprints
  getSprints: (projectId: string, limit?: number) => Promise<Sprint[]>;
  getActiveSprint: (projectId: string) => Promise<Sprint | null>;
  createSprint: (projectId: string, payload: CreateSprintPayload) => Promise<Sprint | null>;
  completeSprint: (projectId: string, sprintId: string, payload?: CompleteSprintPayload) => Promise<{ completed_sprint: Sprint; next_sprint?: Sprint | null } | null>;

  // Reasonings
  getReasonings: (projectId: string, params?: { sprintId?: string; reasoningType?: string; limit?: number }) => Promise<Reasoning[]>;
  getReasoningById: (projectId: string, reasoningId: string) => Promise<Reasoning | null>;
  getReasoningActionItems: (projectId: string, reasoningId: string) => Promise<ReasoningActionItem[]>;
  createReasoning: (projectId: string, payload: CreateReasoningPayload) => Promise<Reasoning | null>;
  updateReasoningInteraction: (projectId: string, reasoningId: string, payload: UpdateReasoningInteractionPayload) => Promise<boolean>;
  updateReasoningActionItem: (projectId: string, reasoningId: string, itemId: string, payload: UpdateReasoningActionItemPayload) => Promise<ReasoningActionItem | null>;
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
  const [projectsStats, setProjectsStats] = useState<ProjectDashboardStats | null>(null);
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
        status: project.status || PROJECT_STATUS.OPEN,
        methodology: project.methodology || "kanban",
        progress: project.properties?.progress || 0,
        notesCount: Array.isArray(project.notes) ? project.notes.length : 0,
        collaboratorsCount: Array.isArray(project.collaborators)
          ? project.collaborators.filter((c) => !c.removed).length
          : 0,
        color: project.properties?.color ?? undefined,
        icon: typeof project.properties?.icon === 'string' ? project.properties.icon : undefined, // Corrige o tipo de 'icon' para garantir compatibilidade
        priority: project.properties?.priority ?? undefined,
        complexity: project.properties?.complexity ?? undefined,
        estimatedTime: project.properties?.estimated_time ?? undefined,
        tags: project.properties?.tags ?? undefined,
        lastModified: project.updated_at || project.created_at,
        subprojects: project.subprojects ?? [],
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

  const getMyProjectView = useCallback(
    async (projectId: string): Promise<"board" | "list"> => {
      if (!user?.id || !projectId) return "board";
      try {
        return await getMyProjectViewService(projectId);
      } catch (err: unknown) {
        console.error("Erro ao buscar preferência de vista:", err);
        return "board";
      }
    },
    [user?.id]
  );

  const setMyProjectView = useCallback(
    async (projectId: string, view: "board" | "list"): Promise<"board" | "list"> => {
      if (!user?.id || !projectId) return view;
      try {
        return await setMyProjectViewService(projectId, view);
      } catch (err: unknown) {
        console.error("Erro ao gravar preferência de vista:", err);
        return view;
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
    async (projectId: string, projectData: UpdateProjectData | FormData): Promise<Project | null> => {
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
    const openProjects = projectsOverview.filter((p) => p.status === PROJECT_STATUS.OPEN).length;
    const inProgressProjects = projectsOverview.filter(
      (p) => p.status === PROJECT_STATUS.IN_PROGRESS
    ).length;
    const completedProjects = projectsOverview.filter(
      (p) => p.status === PROJECT_STATUS.COMPLETED
    ).length;
    const pausedProjects = projectsOverview.filter((p) => p.status === PROJECT_STATUS.PAUSED).length;
    const archivedProjects = projectsOverview.filter(
      (p) => p.status === PROJECT_STATUS.ARCHIVED
    ).length;
    const activeProjects = openProjects + inProgressProjects;
    const totalNotes = projectsOverview.reduce((acc, p) => acc + p.notesCount, 0);
    const totalCollaborators = projectsOverview.reduce((acc, p) => acc + p.collaboratorsCount, 0);
    const averageProgress =
      totalProjects > 0
        ? Math.round(projectsOverview.reduce((acc, p) => acc + p.progress, 0) / totalProjects)
        : 0;

    const statusDistribution: Record<string, number> = {
      OPEN: openProjects,
      IN_PROGRESS: inProgressProjects,
      COMPLETED: completedProjects,
      PAUSED: pausedProjects,
      ARCHIVED: archivedProjects,
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

  const fetchProjectsStats = useCallback(
    async (filters: ProjectStatsFilters = {}): Promise<void> => {
      if (!user?.id) return;
      try {
        const stats = await fetchProjectsStatsService(filters);
        setProjectsStats(stats);
      } catch (err: unknown) {
        console.error("Erro ao buscar stats de projetos:", err);
      }
    },
    [user?.id]
  );

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

  const patchProjectStage = useCallback(
    async (
      projectId: string,
      stageId: string,
      updates: PatchProjectStagePayload
    ): Promise<ProjectStage | null> => {
      if (!user?.id) return null;
      try {
        return await patchProjectStageService(projectId, stageId, updates);
      } catch (err: unknown) {
        console.error("Erro ao atualizar etapa do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // --- TAGS DE PROJETO ---
  const getProjectTags = useCallback(
    async (projectId: string): Promise<ProjectTag[]> => {
      if (!user?.id) return [];

      try {
        return await fetchProjectTagsService(projectId);
      } catch (err: unknown) {
        console.error("Erro ao buscar tags do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const createProjectTag = useCallback(
    async (projectId: string, data: CreateProjectTagData): Promise<ProjectTag | null> => {
      if (!user?.id) return null;

      try {
        return await createProjectTagService(projectId, data);
      } catch (err: unknown) {
        console.error("Erro ao criar tag do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const updateProjectTag = useCallback(
    async (
      projectId: string,
      tagId: string,
      data: UpdateProjectTagData
    ): Promise<ProjectTag | null> => {
      if (!user?.id) return null;

      try {
        return await updateProjectTagService(projectId, tagId, data);
      } catch (err: unknown) {
        console.error("Erro ao atualizar tag do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const deleteProjectTag = useCallback(
    async (projectId: string, tagId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await deleteProjectTagService(projectId, tagId);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover tag do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // --- PRIORIDADES DE TAREFAS ---
  const getTaskPriorities = useCallback(
    async (projectId: string): Promise<TaskPriority[]> => {
      if (!user?.id) return [];

      try {
        return await fetchTaskPrioritiesService(projectId);
      } catch (err: unknown) {
        console.error("Erro ao buscar prioridades de tarefas:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const getOrgTaskPriorities = useCallback(
    async (organizationId: string): Promise<TaskPriority[]> => {
      if (!user?.id) return [];

      try {
        return await fetchOrgTaskPrioritiesService(organizationId);
      } catch (err: unknown) {
        console.error("Erro ao buscar prioridades da organização:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const createTaskPriority = useCallback(
    async (projectId: string, data: CreateTaskPriorityData): Promise<TaskPriority | null> => {
      if (!user?.id) return null;

      try {
        return await createTaskPriorityService(projectId, data);
      } catch (err: unknown) {
        console.error("Erro ao criar prioridade de tarefa:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const updateTaskPriority = useCallback(
    async (
      projectId: string,
      priorityId: string,
      data: UpdateTaskPriorityData
    ): Promise<TaskPriority | null> => {
      if (!user?.id) return null;

      try {
        return await updateTaskPriorityService(projectId, priorityId, data);
      } catch (err: unknown) {
        console.error("Erro ao atualizar prioridade de tarefa:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const deleteTaskPriority = useCallback(
    async (projectId: string, priorityId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        await deleteTaskPriorityService(projectId, priorityId);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover prioridade de tarefa:", err);
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

  const postProjectCollaborator = useCallback(
    async (projectId: string, payload: PostProjectCollaboratorPayload): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await postProjectCollaboratorService(projectId, payload);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao convidar colaborador por role:", err);
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
        console.error("Erro ao buscar tarefas do projeto:", err);
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
        console.error("Erro ao adicionar tarefa ao projeto:", err);
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
        console.error("Erro ao sincronizar tarefa:", err);
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
        console.error("Erro ao remover tarefa do projeto:", err);
        throw err;
      }
    },
    [user?.id, fetchProjects]
  );

  const updateProjectNoteStage = useCallback(
    async (projectId: string, noteId: string, stageId: string): Promise<void> => {
      if (!user?.id) return;

      try {
        await updateProjectNoteStageService(projectId, noteId, stageId);
      } catch (err: unknown) {
        console.error("Erro ao atualizar estágio da tarefa no projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // --- STAGE DELETE ---
  const deleteProjectStage = useCallback(
    async (projectId: string, stageId: string): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await deleteProjectStageService(projectId, stageId);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao remover estágio do projeto:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // --- AI REPORT CONFIG ---
  const getAiReportConfig = useCallback(
    async (projectId: string): Promise<AiReportConfig | null> => {
      if (!user?.id) return null;
      try {
        return await fetchAiReportConfigService(projectId);
      } catch (err: unknown) {
        console.error("Erro ao buscar config de relatório AI:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const updateAiReportConfig = useCallback(
    async (projectId: string, payload: AiReportConfigUpsertPayload): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await putProjectAiReportConfigService(projectId, payload);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao atualizar config de relatório AI:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // --- SPRINTS ---
  const getSprints = useCallback(
    async (projectId: string, limit?: number): Promise<Sprint[]> => {
      if (!user?.id) return [];
      try {
        return await fetchSprintsService(projectId, limit);
      } catch (err: unknown) {
        console.error("Erro ao buscar sprints:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const getActiveSprint = useCallback(
    async (projectId: string): Promise<Sprint | null> => {
      if (!user?.id) return null;
      try {
        return await fetchActiveSprintService(projectId);
      } catch (err: unknown) {
        console.error("Erro ao buscar sprint ativa:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const createSprintFn = useCallback(
    async (projectId: string, payload: CreateSprintPayload): Promise<Sprint | null> => {
      if (!user?.id) return null;
      try {
        return await createSprintService(projectId, payload);
      } catch (err: unknown) {
        console.error("Erro ao criar sprint:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const completeSprintFn = useCallback(
    async (projectId: string, sprintId: string, payload?: CompleteSprintPayload): Promise<{ completed_sprint: Sprint; next_sprint?: Sprint | null } | null> => {
      if (!user?.id) return null;
      try {
        return await completeSprintService(projectId, sprintId, payload);
      } catch (err: unknown) {
        console.error("Erro ao completar sprint:", err);
        throw err;
      }
    },
    [user?.id]
  );

  // --- REASONINGS ---
  const getReasonings = useCallback(
    async (projectId: string, params?: { sprintId?: string; reasoningType?: string; limit?: number }): Promise<Reasoning[]> => {
      if (!user?.id) return [];
      try {
        return await fetchReasoningsService(projectId, params);
      } catch (err: unknown) {
        console.error("Erro ao buscar reasonings:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const getReasoningById = useCallback(
    async (projectId: string, reasoningId: string): Promise<Reasoning | null> => {
      if (!user?.id) return null;
      try {
        return await fetchReasoningByIdService(projectId, reasoningId);
      } catch (err: unknown) {
        console.error("Erro ao buscar reasoning:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const getReasoningActionItems = useCallback(
    async (projectId: string, reasoningId: string): Promise<ReasoningActionItem[]> => {
      if (!user?.id) return [];
      try {
        return await fetchReasoningActionItemsService(projectId, reasoningId);
      } catch (err: unknown) {
        console.error("Erro ao buscar action items:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const createReasoningFn = useCallback(
    async (projectId: string, payload: CreateReasoningPayload): Promise<Reasoning | null> => {
      if (!user?.id) return null;
      try {
        return await createReasoningService(projectId, payload);
      } catch (err: unknown) {
        console.error("Erro ao criar reasoning:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const updateReasoningInteractionFn = useCallback(
    async (projectId: string, reasoningId: string, payload: UpdateReasoningInteractionPayload): Promise<boolean> => {
      if (!user?.id) return false;
      try {
        await updateReasoningInteractionService(projectId, reasoningId, payload);
        return true;
      } catch (err: unknown) {
        console.error("Erro ao atualizar interação:", err);
        throw err;
      }
    },
    [user?.id]
  );

  const updateReasoningActionItemFn = useCallback(
    async (projectId: string, reasoningId: string, itemId: string, payload: UpdateReasoningActionItemPayload): Promise<ReasoningActionItem | null> => {
      if (!user?.id) return null;
      try {
        return await updateReasoningActionItemService(projectId, reasoningId, itemId, payload);
      } catch (err: unknown) {
        console.error("Erro ao atualizar action item:", err);
        throw err;
      }
    },
    [user?.id]
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
    projectsStats,
    loading,
    error,
    lastFetch,
    refreshInterval,
    fetchProjects,
    refreshProjects,
    getProjectById,
    getMyProjectView,
    setMyProjectView,
    createProject,
    updateProject,
    deleteProject,
    getRecentProjects,
    getProjectsByStatus,
    getProjectsStats,
    fetchProjectsStats,
    getProjectStages,
    patchProjectStage,
    getProjectTags,
    createProjectTag,
    updateProjectTag,
    deleteProjectTag,
    getTaskPriorities,
    getOrgTaskPriorities,
    createTaskPriority,
    updateTaskPriority,
    deleteTaskPriority,
    getCollaborators,
    postProjectCollaborator,
    addCollaborator,
    updateCollaboratorPermission,
    removeCollaborator,
    getProjectNotes,
    addNoteToProject,
    syncProjectNote,
    removeNoteFromProject,
    updateProjectNoteStage,
    deleteProjectStage,
    getAiReportConfig,
    updateAiReportConfig,
    getSprints,
    getActiveSprint,
    createSprint: createSprintFn,
    completeSprint: completeSprintFn,
    getReasonings,
    getReasoningById,
    getReasoningActionItems,
    createReasoning: createReasoningFn,
    updateReasoningInteraction: updateReasoningInteractionFn,
    updateReasoningActionItem: updateReasoningActionItemFn,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export default ProjectsContext;
