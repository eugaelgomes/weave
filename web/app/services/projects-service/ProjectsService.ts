// services/projects-service/ProjectsService.ts
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-routes";

export interface ProjectProperties {
  priority?: "alta" | "media" | "baixa";
  tags?: string[];
  estimated_time?: string;
  progress?: number;
  complexity?: "alta" | "media" | "baixa";
  color?: string;
  icon?: string;
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
  title: string;
  description?: string;
  properties?: ProjectProperties;
  status: "open" | "running" | "completed" | "on-hold" | "archived";
  created_at: string;
  updated_at: string;
  deleted: boolean;
  owner?: ProjectOwner;
  collaborators?: ProjectCollaborator[];
  notes?: ProjectNote[];
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface CreateProjectData {
  title: string;
  description?: string;
  status?: "open" | "running" | "completed" | "on-hold" | "archived";
  properties?: Omit<ProjectProperties, "progress">;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  status?: "open" | "running" | "completed" | "on-hold" | "archived";
  properties?: Omit<ProjectProperties, "progress">;
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

// Helper para tratar propriedades que podem vir como string JSON do banco
const parseProjectProperties = (project: Project): Project => {
  if (typeof project.properties === "string") {
    try {
      project.properties = JSON.parse(project.properties);
    } catch {
      // Falha silenciosa ou log opcional se necessário
      console.warn(`Failed to parse properties for project ${project.id}`);
    }
  }
  return project;
};

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
  return await handleResponse<Project>(response);
};

export const updateProject = async (
  projectId: string,
  projectData: UpdateProjectData
): Promise<Project> => {
  const response = await apiClient.put(API_ENDPOINTS.PROJECTS_BY_ID(projectId), projectData);
  const data = await handleResponse<{ message: string; project: Project }>(response);
  return data.project;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
  await handleResponse<{ message: string }>(response);
};

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
