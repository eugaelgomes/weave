import { apiClient, handleResponse, API_ENDPOINTS } from "../api-methods";

export interface ProjectTag {
  id: string;
  project_id?: string | null;
  org_id?: string | null;
  name: string;
  color_hex: string | null;
  user_id?: string;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface TaskPriority {
  id: string;
  project_id?: string | null;
  org_id?: string | null;
  name: string;
  color_hex: string | null;
  sort_order: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface CreateProjectTagData {
  name: string;
  color?: string;
}

export interface UpdateProjectTagData {
  name?: string;
  color?: string;
}

export interface CreateTaskPriorityData {
  name: string;
  color?: string;
  level: number;
}

export interface UpdateTaskPriorityData {
  name?: string;
  color?: string;
  level?: number;
}

export const fetchProjectTags = async (projectId: string): Promise<ProjectTag[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_TAGS(projectId));
  return handleResponse<ProjectTag[]>(response);
};

export const createProjectTag = async (
  projectId: string,
  tagData: CreateProjectTagData
): Promise<ProjectTag> => {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS_TAGS(projectId), tagData);
  return handleResponse<ProjectTag>(response);
};

export const updateProjectTag = async (
  projectId: string,
  tagId: string,
  tagData: UpdateProjectTagData
): Promise<ProjectTag> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_TAG_BY_ID(projectId, tagId),
    tagData
  );
  return handleResponse<ProjectTag>(response);
};

export const deleteProjectTag = async (projectId: string, tagId: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.PROJECTS_TAG_BY_ID(projectId, tagId));
  await handleResponse<{ message: string }>(response);
};

export const fetchTaskPriorities = async (projectId: string): Promise<TaskPriority[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_TASK_PRIORITIES(projectId));
  return handleResponse<TaskPriority[]>(response);
};

export const createTaskPriority = async (
  projectId: string,
  priorityData: CreateTaskPriorityData
): Promise<TaskPriority> => {
  const response = await apiClient.post(
    API_ENDPOINTS.PROJECTS_TASK_PRIORITIES(projectId),
    priorityData
  );
  return handleResponse<TaskPriority>(response);
};

export const updateTaskPriority = async (
  projectId: string,
  priorityId: string,
  priorityData: UpdateTaskPriorityData
): Promise<TaskPriority> => {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_TASK_PRIORITY_BY_ID(projectId, priorityId),
    priorityData
  );
  return handleResponse<TaskPriority>(response);
};

export const deleteTaskPriority = async (projectId: string, priorityId: string): Promise<void> => {
  const response = await apiClient.delete(
    API_ENDPOINTS.PROJECTS_TASK_PRIORITY_BY_ID(projectId, priorityId)
  );
  await handleResponse<{ message: string }>(response);
};
