import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import type { ProjectStatus } from "@/app/_utils/db-enums";
import {
  AckSchema,
  ActiveSprintEnvelopeSchema,
  AiReportConfigEnvelopeSchema,
  CollaboratorsListSchema,
  CompleteSprintResponseSchema,
  CreateSprintEnvelopeSchema,
  InteractionEnvelopeSchema,
  ManageCollaboratorsResponseSchema,
  ManageNotesResponseSchema,
  MessageOnlySchema,
  NoteStageUpdateResponseSchema,
  PatchStageEnvelopeSchema,
  PostCollaboratorResponseSchema,
  ProjectDashboardStatsSchema,
  ProjectNotesListSchema,
  ProjectSchema,
  ProjectsResponseSchema,
  ProjectStagesListSchema,
  PutAiReportConfigResponseSchema,
  ReasoningActionItemEnvelopeSchema,
  ReasoningActionItemsListSchema,
  ReasoningEnvelopeSchema,
  ReasoningsListSchema,
  SprintsListSchema,
  UpdateProjectEnvelopeSchema,
} from "./projects.schema";

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
  const raw = await handleResponse<unknown>(response);
  const data = ProjectsResponseSchema.parse(raw);
  return data.projects.map((p) => parseProjectProperties(p as Project));
};

export const fetchProjectById = async (projectId: string): Promise<Project> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
  const raw = await handleResponse<unknown>(response);
  const project = ProjectSchema.parse(raw);
  return parseProjectProperties(project as Project);
};

export const createProject = async (projectData: CreateProjectData): Promise<Project> => {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS, projectData);
  const raw = await handleResponse<unknown>(response);
  const project = ProjectSchema.parse(raw);
  return parseProjectProperties(project as Project);
};

export const updateProject = async (
  projectId: string,
  projectData: UpdateProjectData | FormData
): Promise<Project> => {
  const response = await apiClient.put(API_ENDPOINTS.PROJECTS_BY_ID(projectId), projectData);
  const raw = await handleResponse<unknown>(response);
  const data = UpdateProjectEnvelopeSchema.parse(raw);
  return parseProjectProperties(data.project as Project);
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
  const raw = await handleResponse<unknown>(response);
  AckSchema.parse(raw ?? {});
};

const DEFAULT_PROJECT_STAGE_PROPERTIES: ProjectStageProperties = {
  is_done: false,
  wip_limit: null,
  description: null,
  auto_assign_to_creator: false,
};

/**
 * API may return stage.properties as JSON string or object; normalize for {@link ProjectStage}.
 */
function parseProjectStagePropertiesFromApi(
  raw: string | ProjectStageProperties,
  stageId: string
): ProjectStageProperties {
  if (typeof raw !== "string") {
    return raw;
  }
  try {
    return JSON.parse(raw) as ProjectStageProperties;
  } catch {
    console.warn(`Failed to parse properties for stage ${stageId}`);
    return DEFAULT_PROJECT_STAGE_PROPERTIES;
  }
}

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
  const raw = await handleResponse<unknown>(response);
  const data = PatchStageEnvelopeSchema.parse(raw);
  return {
    ...data.stage,
    properties: parseProjectStagePropertiesFromApi(data.stage.properties, data.stage.id),
  };
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
  const raw = await handleResponse<unknown>(response);
  return PostCollaboratorResponseSchema.parse(raw);
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
  const raw = await handleResponse<unknown>(response);
  return PutAiReportConfigResponseSchema.parse(raw);
};

export const fetchProjectStages = async (projectId: string): Promise<ProjectStage[]> => {
  const endpoint = `${API_ENDPOINTS.PROJECTS_BY_ID(projectId)}/stages`;
  const response = await apiClient.get(endpoint);

  const raw = await handleResponse<unknown>(response);
  const data = ProjectStagesListSchema.parse(raw);

  return data.stages.map(
    (stage): ProjectStage => ({
      ...stage,
      properties: parseProjectStagePropertiesFromApi(stage.properties, stage.id),
    })
  );
};

// --- COLABORADORES ---

export const fetchProjectCollaborators = async (
  projectId: string
): Promise<ProjectCollaborator[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_COLLABORATORS(projectId));
  const raw = await handleResponse<unknown>(response);
  const data = CollaboratorsListSchema.parse(raw);
  return data.collaborators as ProjectCollaborator[];
};

export const manageCollaborator = async (
  projectId: string,
  collaboratorData: ManageCollaboratorData
): Promise<ProjectCollaborator[]> => {
  const response = await apiClient.put(
    API_ENDPOINTS.PROJECTS_COLLABORATORS(projectId),
    collaboratorData
  );
  const raw = await handleResponse<unknown>(response);
  const data = ManageCollaboratorsResponseSchema.parse(raw);
  return (data.collaborators as ProjectCollaborator[]) || [];
};

// --- NOTAS (CARDS) ---

export const fetchProjectNotes = async (projectId: string): Promise<ProjectNote[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_NOTES(projectId));
  const raw = await handleResponse<unknown>(response);
  const data = ProjectNotesListSchema.parse(raw);
  return data.notes as ProjectNote[];
};

export const manageProjectNote = async (
  projectId: string,
  noteData: ManageNoteData
): Promise<ProjectNote[]> => {
  const response = await apiClient.put(API_ENDPOINTS.PROJECTS_NOTES(projectId), noteData);
  const raw = await handleResponse<unknown>(response);
  const data = ManageNotesResponseSchema.parse(raw);
  return (data.notes as ProjectNote[]) || [];
};

export const updateProjectNoteStage = async (
  projectId: string,
  noteId: string,
  stageId: string
): Promise<{ message: string; noteId: string; newStageId: string }> => {
  const response = await apiClient.put(API_ENDPOINTS.PROJECTS_NOTE_STAGE(projectId, noteId), {
    stageId,
  });
  const raw = await handleResponse<unknown>(response);
  return NoteStageUpdateResponseSchema.parse(raw);
};

// --- STAGE DELETE ---

export const deleteProjectStage = async (
  projectId: string,
  stageId: string
): Promise<{ message: string }> => {
  const response = await apiClient.delete(
    API_ENDPOINTS.PROJECTS_STAGE_BY_ID(projectId, stageId)
  );
  const raw = await handleResponse<unknown>(response);
  return MessageOnlySchema.parse(raw);
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
  const raw = await handleResponse<unknown>(response);
  const data = AiReportConfigEnvelopeSchema.parse(raw);
  return data.config as AiReportConfig | null;
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
  const raw = await handleResponse<unknown>(response);
  const data = SprintsListSchema.parse(raw);
  return data.sprints as Sprint[];
};

export const fetchActiveSprint = async (
  projectId: string
): Promise<Sprint | null> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_SPRINT_ACTIVE(projectId));
  const raw = await handleResponse<unknown>(response);
  const data = ActiveSprintEnvelopeSchema.parse(raw);
  return data.sprint as Sprint | null;
};

export const createSprint = async (
  projectId: string,
  payload: CreateSprintPayload
): Promise<Sprint> => {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS_SPRINTS(projectId), payload);
  const raw = await handleResponse<unknown>(response);
  const data = CreateSprintEnvelopeSchema.parse(raw);
  return data.sprint as Sprint;
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
  const raw = await handleResponse<unknown>(response);
  const data = CompleteSprintResponseSchema.parse(raw);
  return {
    completed_sprint: data.completed_sprint as Sprint,
    next_sprint: (data.next_sprint ?? null) as Sprint | null,
  };
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
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningsListSchema.parse(raw);
  return data.reasonings as Reasoning[];
};

export const fetchReasoningById = async (
  projectId: string,
  reasoningId: string
): Promise<Reasoning> => {
  const response = await apiClient.get(
    API_ENDPOINTS.PROJECTS_REASONING_BY_ID(projectId, reasoningId)
  );
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningEnvelopeSchema.parse(raw);
  return data.reasoning as Reasoning;
};

export const fetchReasoningActionItems = async (
  projectId: string,
  reasoningId: string
): Promise<ReasoningActionItem[]> => {
  const response = await apiClient.get(
    API_ENDPOINTS.PROJECTS_REASONING_ACTION_ITEMS(projectId, reasoningId)
  );
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningActionItemsListSchema.parse(raw);
  return data.actionItems as ReasoningActionItem[];
};

export const createReasoning = async (
  projectId: string,
  payload: CreateReasoningPayload
): Promise<Reasoning> => {
  const response = await apiClient.post(
    API_ENDPOINTS.PROJECTS_REASONINGS(projectId),
    payload
  );
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningEnvelopeSchema.parse(raw);
  return data.reasoning as Reasoning;
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
  const raw = await handleResponse<unknown>(response);
  const data = InteractionEnvelopeSchema.parse(raw);
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
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningActionItemEnvelopeSchema.parse(raw);
  return data.actionItem as ReasoningActionItem;
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
  const raw = await handleResponse<unknown>(response);
  return ProjectDashboardStatsSchema.parse(raw) as ProjectDashboardStats;
};
