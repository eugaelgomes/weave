import { z } from "zod";
import { apiClient, handleResponse, API_ENDPOINTS } from "../api-methods";
import { ProjectTagSchema, TaskPrioritySchema, type ProjectTag, type TaskPriority } from "./project-taxonomy.schema";

export type { ProjectTag, TaskPriority };

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

const tagsOrArray = (raw: unknown) => z.array(ProjectTagSchema).parse(raw);

export const fetchProjectTags = async (projectId: string): Promise<ProjectTag[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_TAGS(projectId));
  const raw = await handleResponse<unknown>(response);
  return tagsOrArray(raw);
};

export const createProjectTag = async (
  projectId: string,
  tagData: CreateProjectTagData
): Promise<ProjectTag> => {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS_TAGS(projectId), tagData);
  const raw = await handleResponse<unknown>(response);
  return ProjectTagSchema.parse(raw);
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
  const raw = await handleResponse<unknown>(response);
  return ProjectTagSchema.parse(raw);
};

export const deleteProjectTag = async (projectId: string, tagId: string): Promise<void> => {
  const response = await apiClient.delete(API_ENDPOINTS.PROJECTS_TAG_BY_ID(projectId, tagId));
  await handleResponse<unknown>(response);
};

const prioritiesOrArray = (raw: unknown) => z.array(TaskPrioritySchema).parse(raw);

export const fetchTaskPriorities = async (projectId: string): Promise<TaskPriority[]> => {
  const response = await apiClient.get(API_ENDPOINTS.PROJECTS_TASK_PRIORITIES(projectId));
  const raw = await handleResponse<unknown>(response);
  return prioritiesOrArray(raw);
};

export const fetchOrgTaskPriorities = async (orgId: string): Promise<TaskPriority[]> => {
  const response = await apiClient.get(API_ENDPOINTS.ORGANIZATIONS_TASK_PRIORITIES(orgId));
  const raw = await handleResponse<unknown>(response);
  return prioritiesOrArray(raw);
};

export const createTaskPriority = async (
  projectId: string,
  priorityData: CreateTaskPriorityData
): Promise<TaskPriority> => {
  const response = await apiClient.post(
    API_ENDPOINTS.PROJECTS_TASK_PRIORITIES(projectId),
    priorityData
  );
  const raw = await handleResponse<unknown>(response);
  return TaskPrioritySchema.parse(raw);
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
  const raw = await handleResponse<unknown>(response);
  return TaskPrioritySchema.parse(raw);
};

export const deleteTaskPriority = async (projectId: string, priorityId: string): Promise<void> => {
  const response = await apiClient.delete(
    API_ENDPOINTS.PROJECTS_TASK_PRIORITY_BY_ID(projectId, priorityId)
  );
  await handleResponse<unknown>(response);
};
