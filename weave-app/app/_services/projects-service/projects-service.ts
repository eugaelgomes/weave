import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import type { ProjectStatus } from "@/app/_utils/db-enums";

export interface ProjectProperties {
  // UI & Design
  color?: string | null;
  /** Emoji (legacy) or image object from storage: `{ name, path, type, size }`. */
  icon?: string | null | { name: string; path: string; type: string; size: string };
  tags?: string[];

  // Gestão de Tempo e Prioridade
  priority?: "alta" | "media" | "baixa" | null;
  complexity?: "alta" | "media" | "baixa" | null;
  estimated_time?: string | null;
  progress?: number;

  // Metadados de Metodologias (Scrum/Kanban)
  type?: "custom" | "continuous_flow" | "iterative" | string;
  wip_limit_enabled?: boolean;
  lead_time_target_days?: number | null;
  sprint_duration_weeks?: number | null;
  estimation_type?: string | null;
}

export interface ProjectStageProperties {
  is_done: boolean;
  wip_limit: number | null;
  description: string | null;
  auto_assign_to_creator: boolean;
}

export interface ProjectStage {
  id: string;
  project_id: string;
  name: string;
  position: number;
  color: string | null;
  properties: ProjectStageProperties;
  created_at: string;
  updated_at: string;
}

export interface ProjectOwner {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface ProjectCollaborator {
  user_id: string;
  name?: string;
  username: string;
  email: string;
  avatar_url?: string;
  permission: "admin" | "viewer";
  added_at: string;
  removed: boolean;
}

export interface ProjectNote {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  status?: string;
  project_stage_id?: string | null;
  created_by?: {
    user_id: string;
    username: string;
  };
  collaborators?: Array<{
    user_id: string;
    username: string;
    permission: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface SubProject {
  id: string;
  title: string;
  description?: string;
  status: string;
  properties?: ProjectProperties;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  org_id?: string | null;
  parent_project_id?: string | null;
  title: string;
  description?: string;
  properties?: ProjectProperties;
  status: ProjectStatus;
  methodology: "scrum" | "kanban" | "waterfall" | "custom";
  default_view: "board" | "list" | "calendar" | "timeline" | "gantt";
  created_at: string;
  updated_at: string;
  deleted: boolean;
  active: boolean;

  // Relacionamentos Opcionais
  owner?: ProjectOwner;
  collaborators?: ProjectCollaborator[];
  notes?: ProjectNote[];
  stages?: ProjectStage[];
  subprojects?: SubProject[];
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface CreateProjectData {
  title: string;
  description?: string;
  status?: ProjectStatus;
  methodology?: "scrum" | "kanban" | "waterfall" | "custom";
  default_view?: "board" | "list" | "calendar" | "timeline" | "gantt";
  properties?: Omit<ProjectProperties, "progress">;
  org_id?: string;
  parent_project_id?: string;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  methodology?: "scrum" | "kanban" | "waterfall" | "custom";
  default_view?: "board" | "list" | "calendar" | "timeline" | "gantt";
  properties?: Omit<ProjectProperties, "progress">;
  active?: boolean;
}

export interface ManageCollaboratorData {
  action: "add" | "update" | "remove";
  userId: string;
  permission?: "admin" | "viewer";
}

export interface ManageNoteData {
  action: "add" | "sync" | "remove";
  noteId: string;
}

/**
 * Trata propriedades e json arrays que podem vir como string do banco de dados (PostgreSQL)
 */
const parseProjectProperties = (project: Project): Project => {
  if (typeof project.properties === "string") {
    try {
      project.properties = JSON.parse(project.properties);
    } catch {
      console.warn(`Failed to parse properties for project ${project.id}`);
    }
  }

  if (project.stages && Array.isArray(project.stages)) {
    project.stages = project.stages.map((stage) => {
      if (typeof stage.properties === "string") {
        try {
          stage.properties = JSON.parse(stage.properties);
        } catch {
          console.warn(`Failed to parse properties for stage ${stage.id}`);
        }
      }
      return stage;
    });
  }

  return project;
};

// ==========================================
// API METHODS
// ==========================================

export const fetchProjects = async (): Promise<Project[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS);
  const data = await handleResponse<ProjectsResponse>(response);
  return data.projects.map(parseProjectProperties);
};

export const fetchProjectById = async (projectId: string): Promise<Project> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
  const project = await handleResponse<Project>(response);
  return parseProjectProperties(project);
};

export const createProject = async (projectData: CreateProjectData): Promise<Project> => {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS, projectData);
  const project = await handleResponse<Project>(response);
  return parseProjectProperties(project);
};

export const updateProject = async (
  projectId: string,
  projectData: UpdateProjectData | FormData
): Promise<Project> => {
  const response = await apiClient.put(API_ENDPOINTS.PROJECTS_BY_ID(projectId), projectData);
  const data = await handleResponse<{ message: string; project: Project }>(response);
  return parseProjectProperties(data.project);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
  await handleResponse<{ message: string }>(response);
};

/**
 * Busca as etapas (colunas do Board) de um projeto específico
 */
export interface PatchProjectStagePayload {
  name?: string;
  position?: number;
  color?: string | null;
  properties?: Record<string, unknown>;
}

export const patchProjectStage = async (
  projectId: string,
  stageId: string,
  updates: PatchProjectStagePayload
): Promise<ProjectStage> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_STAGE_BY_ID(projectId, stageId),
    updates
  );
  const data = await handleResponse<{ message: string; stage: ProjectStage }>(response);
  const stage = data.stage;
  if (typeof stage.properties === "string") {
    try {
      stage.properties = JSON.parse(stage.properties) as ProjectStage["properties"];
    } catch {
      console.warn(`Failed to parse properties for stage ${stage.id}`);
    }
  }
  return stage;
};

export interface PostProjectCollaboratorPayload {
  userId: string;
  role: string;
}

export const postProjectCollaborator = async (
  projectId: string,
  body: PostProjectCollaboratorPayload
): Promise<{ message?: string; collaborators?: unknown[] }> => {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS_COLLABORATORS(projectId), body);
  return handleResponse<{ message?: string; collaborators?: unknown[] }>(response);
};

export interface AiReportConfigUpsertPayload {
  enabled?: boolean;
  default_sprint_duration_days?: number;
  default_workable_days?: number[];
  auto_create_next_sprint?: boolean;
  enable_sprint_kickoff?: boolean;
  enable_daily_standup?: boolean;
  enable_sprint_review?: boolean;
  report_time_utc?: string;
  channels?: Array<"in_app" | "email">;
  recipient_scope?: "owner_only" | "all_members" | "custom";
  custom_recipients?: unknown;
}

export const putProjectAiReportConfig = async (
  projectId: string,
  body: AiReportConfigUpsertPayload
): Promise<{ message?: string; config?: unknown }> => {
  const response = await apiClient.put(
    API_ENDPOINTS.PROJECTS_AI_REPORT_CONFIG(projectId),
    body
  );
  return handleResponse<{ message?: string; config?: unknown }>(response);
};

export const fetchProjectStages = async (projectId: string): Promise<ProjectStage[]> => {
  // Caso a rota já exista no seu API_ENDPOINTS use-a, caso contrário usamos template literal
  const endpoint = `${API_ENDPOINTS.PROJECTS_BY_ID(projectId)}/stages`;
  const response = await apiClient.get(endpoint);

  const data = await handleResponse<{ stages: ProjectStage[] }>(response);

  return data.stages.map((stage) => {
    if (typeof stage.properties === "string") {
      try {
        stage.properties = JSON.parse(stage.properties);
      } catch {
        console.warn(`Failed to parse properties for stage ${stage.id}`);
      }
    }
    return stage;
  });
};

// --- COLABORADORES ---

export const fetchProjectCollaborators = async (
  projectId: string
): Promise<ProjectCollaborator[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_COLLABORATORS(projectId));
  const data = await handleResponse<{ collaborators: ProjectCollaborator[] }>(response);
  return data.collaborators;
};

export const manageCollaborator = async (
  projectId: string,
  collaboratorData: ManageCollaboratorData
): Promise<ProjectCollaborator[]> => {
  const response = await apiClient.put(
    API_ENDPOINTS.PROJECTS_COLLABORATORS(projectId),
    collaboratorData
  );
  const data = await handleResponse<{
    message: string;
    collaborators?: ProjectCollaborator[];
  }>(response);
  return data.collaborators || [];
};

// --- NOTAS (CARDS) ---

export const fetchProjectNotes = async (projectId: string): Promise<ProjectNote[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_NOTES(projectId));
  const data = await handleResponse<{ notes: ProjectNote[] }>(response);
  return data.notes;
};

export const manageProjectNote = async (
  projectId: string,
  noteData: ManageNoteData
): Promise<ProjectNote[]> => {
  const response = await apiClient.put(API_ENDPOINTS.PROJECTS_NOTES(projectId), noteData);
  const data = await handleResponse<{ message: string; notes?: ProjectNote[] }>(response);
  return data.notes || [];
};

export const updateProjectNoteStage = async (
  projectId: string,
  noteId: string,
  stageId: string
): Promise<{ message: string; noteId: string; newStageId: string }> => {
  const response = await apiClient.put(API_ENDPOINTS.PROJECTS_NOTE_STAGE(projectId, noteId), {
    stageId,
  });
  return handleResponse<{ message: string; noteId: string; newStageId: string }>(response);
};

// --- STAGE DELETE ---

export const deleteProjectStage = async (
  projectId: string,
  stageId: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete(
    API_ENDPOINTS.PROJECTS_STAGE_BY_ID(projectId, stageId)
  );
  return handleResponse<{ message: string }>(response);
};

// --- AI REPORT CONFIG READ ---

export interface AiReportConfig {
  id?: string;
  project_id?: string;
  enabled: boolean;
  default_sprint_duration_days: number;
  default_workable_days: number[];
  auto_create_next_sprint: boolean;
  enable_sprint_kickoff: boolean;
  enable_daily_standup: boolean;
  enable_sprint_review: boolean;
  report_time_utc: string;
  channels: Array<"in_app" | "email">;
  recipient_scope: "owner_only" | "all_members" | "custom";
  custom_recipients?: unknown;
  created_at?: string;
  updated_at?: string;
}

export const fetchAiReportConfig = async (
  projectId: string
): Promise<AiReportConfig | null> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_AI_REPORT_CONFIG(projectId));
  const data = await handleResponse<{ config: AiReportConfig | null }>(response);
  return data.config;
};

// --- SPRINTS ---

export interface Sprint {
  id: string;
  project_id: string;
  sprint_number: number;
  title?: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "planned";
  completed_at?: string | null;
  summary?: string | null;
  metrics?: Record<string, unknown> | null;
  workable_days?: number[];
  created_at: string;
  updated_at: string;
}

export interface CreateSprintPayload {
  start_date: string;
  end_date: string;
  title?: string;
  goal?: string;
  workable_days?: number[];
  activate?: boolean;
}

export interface CompleteSprintPayload {
  summary?: string;
  metrics?: Record<string, unknown>;
}

export const fetchSprints = async (
  projectId: string,
  limit = 20
): Promise<Sprint[]> => {
  const endpoint = `${API_ENDPOINTS.PROJECTS_SPRINTS(projectId)}?limit=${limit}`;
  const response = await apiClient.get(endpoint);
  const data = await handleResponse<{ sprints: Sprint[] }>(response);
  return data.sprints;
};

export const fetchActiveSprint = async (
  projectId: string
): Promise<Sprint | null> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_SPRINT_ACTIVE(projectId));
  const data = await handleResponse<{ sprint: Sprint | null }>(response);
  return data.sprint;
};

export const createSprint = async (
  projectId: string,
  payload: CreateSprintPayload
): Promise<Sprint> => {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS_SPRINTS(projectId), payload);
  const data = await handleResponse<{ message: string; sprint: Sprint }>(response);
  return data.sprint;
};

export const completeSprint = async (
  projectId: string,
  sprintId: string,
  payload?: CompleteSprintPayload
): Promise<{ completed_sprint: Sprint; next_sprint?: Sprint | null }> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_SPRINT_COMPLETE(projectId, sprintId),
    payload
  );
  return handleResponse<{ message: string; completed_sprint: Sprint; next_sprint?: Sprint | null }>(response);
};

// --- REASONINGS ---

export interface Reasoning {
  id: string;
  project_id: string;
  sprint_id?: string | null;
  reasoning_type?: string;
  title: string;
  content?: string | null;
  options?: Record<string, unknown> | null;
  is_read?: boolean;
  is_dismissed?: boolean;
  is_pinned?: boolean;
  feedback?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReasoningActionItem {
  id: string;
  reasoning_id: string;
  description?: string;
  is_completed: boolean;
  assigned_to?: string | null;
  priority?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReasoningPayload {
  sprintId?: string;
  reasoningType?: string;
  title: string;
  content?: string;
  options?: Record<string, unknown>;
}

export interface UpdateReasoningInteractionPayload {
  isRead?: boolean;
  isDismissed?: boolean;
  isPinned?: boolean;
  feedback?: string;
}

export interface UpdateReasoningActionItemPayload {
  isCompleted?: boolean;
  assignedTo?: string;
  priority?: string;
}

export const fetchReasonings = async (
  projectId: string,
  params?: { sprintId?: string; reasoningType?: string; limit?: number }
): Promise<Reasoning[]> => {
  const searchParams = new URLSearchParams();
  if (params?.sprintId) searchParams.set("sprintId", params.sprintId);
  if (params?.reasoningType) searchParams.set("reasoningType", params.reasoningType);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();
  const endpoint = query
    ? `${API_ENDPOINTS.PROJECTS_REASONINGS(projectId)}?${query}`
    : API_ENDPOINTS.PROJECTS_REASONINGS(projectId);
  const response = await apiClient.get(endpoint);
  const data = await handleResponse<{ reasonings: Reasoning[] }>(response);
  return data.reasonings;
};

export const fetchReasoningById = async (
  projectId: string,
  reasoningId: string
): Promise<Reasoning> => {
  const response = await apiClient.get(
    API_ENDPOINTS.PROJECTS_REASONING_BY_ID(projectId, reasoningId)
  );
  const data = await handleResponse<{ reasoning: Reasoning }>(response);
  return data.reasoning;
};

export const fetchReasoningActionItems = async (
  projectId: string,
  reasoningId: string
): Promise<ReasoningActionItem[]> => {
  const response = await apiClient.get(
    API_ENDPOINTS.PROJECTS_REASONING_ACTION_ITEMS(projectId, reasoningId)
  );
  const data = await handleResponse<{ actionItems: ReasoningActionItem[] }>(response);
  return data.actionItems;
};

export const createReasoning = async (
  projectId: string,
  payload: CreateReasoningPayload
): Promise<Reasoning> => {
  const response = await apiClient.post(
    API_ENDPOINTS.PROJECTS_REASONINGS(projectId),
    payload
  );
  const data = await handleResponse<{ reasoning: Reasoning }>(response);
  return data.reasoning;
};

export const updateReasoningInteraction = async (
  projectId: string,
  reasoningId: string,
  payload: UpdateReasoningInteractionPayload
): Promise<unknown> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_REASONING_INTERACTION(projectId, reasoningId),
    payload
  );
  const data = await handleResponse<{ interaction: unknown }>(response);
  return data.interaction;
};

export const updateReasoningActionItem = async (
  projectId: string,
  reasoningId: string,
  itemId: string,
  payload: UpdateReasoningActionItemPayload
): Promise<ReasoningActionItem> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_REASONING_ACTION_ITEM(projectId, reasoningId, itemId),
    payload
  );
  const data = await handleResponse<{ actionItem: ReasoningActionItem }>(response);
  return data.actionItem;
};

// --- STATS ---

export interface ProjectDashboardStats {
  overview: {
    total: number;
    owned: number;
    collaborating: number;
    active: number;
    by_status: {
      OPEN: number;
      IN_PROGRESS: number;
      PAUSED: number;
      COMPLETED: number;
      ARCHIVED: number;
    };
  };
  methodology: {
    kanban: number;
    scrum: number;
    waterfall: number;
    custom: number;
  };
  progress: {
    average: number;
    near_completion: number;
    not_started: number;
  };
  notes: {
    total: number;
    VISIBLE: number;
    ARCHIVED: number;
    SECURE: number;
  };
  tasks: {
    total: number;
    done: number;
    pending: number;
    completion_rate: number;
  };
  filters_applied: {
    status: string | null;
    methodology: string | null;
    from: string | null;
    to: string | null;
    parent_only: boolean;
  };
}

export interface ProjectStatsFilters {
  status?: string;
  methodology?: string;
  from?: string;
  to?: string;
  parent_only?: boolean;
}

export const fetchProjectsStats = async (
  filters: ProjectStatsFilters = {}
): Promise<ProjectDashboardStats> => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.methodology) params.set("methodology", filters.methodology);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.parent_only !== undefined) params.set("parent_only", String(filters.parent_only));

  const query = params.toString();
  const endpoint = query
    ? `${API_ENDPOINTS.PROJECTS_STATS}?${query}`
    : API_ENDPOINTS.PROJECTS_STATS;

  const response = await apiClient.get(endpoint);
  return handleResponse<ProjectDashboardStats>(response);
};
