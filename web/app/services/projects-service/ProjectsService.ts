// services/projects-service/ProjectsService.ts
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-routes";

//
// --- Types ---
//

export interface ProjectProperties {
  priority?: "alta" | "media" | "baixa";
  tags?: string[];
  estimated_time?: string;
  progress?: number; // Read-only, calculated by backend
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
  status: "ativo" | "arquivado" | "concluído";
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
  status?: "ativo" | "arquivado" | "concluído";
  properties?: Omit<ProjectProperties, "progress">;
}

export interface UpdateProjectData {
  title?: string;
  description?: string;
  status?: "ativo" | "arquivado" | "concluído";
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

//
// --- API Functions ---
//

/**
 * Fetch all projects for the authenticated user
 */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PROJECTS);
    const data = await handleResponse<ProjectsResponse>(response);
    
    // Parse properties if it comes as JSON string from backend
    const projects = data.projects.map((project) => {
      if (typeof project.properties === "string") {
        try {
          project.properties = JSON.parse(project.properties);
        } catch (e) {
          console.warn("Failed to parse project properties:", e);
        }
      }
      return project;
    });
    
    return projects;
  } catch (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }
}

/**
 * Fetch a specific project by ID
 */
export async function fetchProjectById(projectId: string): Promise<Project> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
    const project = await handleResponse<Project>(response);
    
    // Parse properties if it comes as JSON string from backend
    if (typeof project.properties === "string") {
      try {
        project.properties = JSON.parse(project.properties);
      } catch (e) {
        console.warn("Failed to parse project properties:", e);
      }
    }
    
    return project;
  } catch (error) {
    console.error(`Error fetching project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Create a new project
 */
export async function createProject(projectData: CreateProjectData): Promise<Project> {
  try {
    const response = await apiClient.post(API_ENDPOINTS.PROJECTS, projectData);
    return await handleResponse<Project>(response);
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}

/**
 * Update an existing project
 */
export async function updateProject(
  projectId: string,
  projectData: UpdateProjectData
): Promise<Project> {
  try {
    const response = await apiClient.put(API_ENDPOINTS.PROJECTS_BY_ID(projectId), projectData);
    const data = await handleResponse<{ message: string; project: Project }>(response);
    return data.project;
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Delete a project (soft delete)
 */
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const response = await apiClient.delete(API_ENDPOINTS.PROJECTS_BY_ID(projectId));
    await handleResponse<{ message: string }>(response);
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Fetch collaborators for a project
 */
export async function fetchProjectCollaborators(
  projectId: string
): Promise<ProjectCollaborator[]> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PROJECTS_COLLABORATORS(projectId));
    const data = await handleResponse<{ collaborators: ProjectCollaborator[] }>(response);
    return data.collaborators;
  } catch (error) {
    console.error(`Error fetching collaborators for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Manage collaborators (add, update, remove)
 */
export async function manageCollaborator(
  projectId: string,
  collaboratorData: ManageCollaboratorData
): Promise<ProjectCollaborator[]> {
  try {
    const response = await apiClient.put(
      API_ENDPOINTS.PROJECTS_COLLABORATORS(projectId),
      collaboratorData
    );
    const data = await handleResponse<{
      message: string;
      collaborators?: ProjectCollaborator[];
    }>(response);
    return data.collaborators || [];
  } catch (error) {
    console.error(`Error managing collaborator for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Fetch notes for a project
 */
export async function fetchProjectNotes(projectId: string): Promise<ProjectNote[]> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.PROJECTS_NOTES(projectId));
    const data = await handleResponse<{ notes: ProjectNote[] }>(response);
    return data.notes;
  } catch (error) {
    console.error(`Error fetching notes for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Manage notes (add, sync, remove)
 */
export async function manageProjectNote(
  projectId: string,
  noteData: ManageNoteData
): Promise<ProjectNote[]> {
  try {
    const response = await apiClient.put(API_ENDPOINTS.PROJECTS_NOTES(projectId), noteData);
    const data = await handleResponse<{ message: string; notes?: ProjectNote[] }>(response);
    return data.notes || [];
  } catch (error) {
    console.error(`Error managing note for project ${projectId}:`, error);
    throw error;
  }
}
