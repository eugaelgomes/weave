import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";

export interface ProjectProperties {
  // UI & Design
  color?: string | null;
  icon?: string | null;
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

export interface Project {
  id: string;
  user_id: string;
  org_id?: string | null;
  title: string;
  description?: string;
  properties?: ProjectProperties;
  status: "open" | "in_progress" | "paused" | "completed" | "archived";
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
  stages?: ProjectStage[]; // Adicionado: A API de criação agora retorna os stages
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface CreateProjectData {
  title: string;
  description?: string;
  status?: "open" | "in_progress" | "paused" | "completed" | "archived";
  methodology?: "scrum" | "kanban" | "waterfall" | "custom";
  default_view?: "board" | "list" | "calendar" | "timeline" | "gantt";
  properties?: Omit<ProjectProperties, "progress">;
  org_id?: string;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  status?: "open" | "in_progress" | "paused" | "completed" | "archived";
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
  projectData: UpdateProjectData
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
