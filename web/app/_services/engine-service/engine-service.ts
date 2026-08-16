import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import {
  ActiveSprintEnvelopeSchema,
  AiReportConfigEnvelopeSchema,
  CompleteSprintResponseSchema,
  CreateSprintEnvelopeSchema,
  InteractionEnvelopeSchema,
  PutAiReportConfigResponseSchema,
  ReasoningActionItemEnvelopeSchema,
  ReasoningActionItemsListSchema,
  ReasoningEnvelopeSchema,
  ReasoningsListSchema,
  SprintsListSchema,
  type AiReportConfig,
  type CreateReasoningPayload,
  type CreateSprintPayload,
  type CompleteSprintPayload,
  type Reasoning,
  type ReasoningActionItem,
  type Sprint,
  type UpdateReasoningInteractionPayload,
  type UpdateReasoningActionItemPayload,
} from "./engine.schema";

export type {
  AiReportConfig,
  CreateReasoningPayload,
  CreateSprintPayload,
  CompleteSprintPayload,
  Reasoning,
  ReasoningActionItem,
  Sprint,
  UpdateReasoningInteractionPayload,
  UpdateReasoningActionItemPayload,
};

// --- AI REPORT CONFIG READ ---

export const fetchAiReportConfig = async (projectId: string): Promise<AiReportConfig | null> => {
  const response = await apiClient.get(API_ENDPOINTS.ENGINE_AI_REPORT_CONFIG(projectId));
  const raw = await handleResponse<unknown>(response);
  const data = AiReportConfigEnvelopeSchema.parse(raw);
  return data.config as AiReportConfig | null;
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
  reasoning_instructions?: import("../projects-service/reasoning-instructions.schema").ReasoningInstructions;
}

export const putProjectAiReportConfig = async (
  projectId: string,
  body: AiReportConfigUpsertPayload
): Promise<{ message?: string; config?: unknown }> => {
  const response = await apiClient.put(API_ENDPOINTS.ENGINE_AI_REPORT_CONFIG(projectId), body);
  const raw = await handleResponse<unknown>(response);
  return PutAiReportConfigResponseSchema.parse(raw);
};

// --- SPRINTS ---

export const fetchSprints = async (projectId: string, limit = 20): Promise<Sprint[]> => {
  const endpoint = `${API_ENDPOINTS.ENGINE_SPRINTS(projectId)}?limit=${limit}`;
  const response = await apiClient.get(endpoint);
  const raw = await handleResponse<unknown>(response);
  const data = SprintsListSchema.parse(raw);
  return data.sprints as Sprint[];
};

export const fetchActiveSprint = async (projectId: string): Promise<Sprint | null> => {
  const response = await apiClient.get(API_ENDPOINTS.ENGINE_SPRINT_ACTIVE(projectId));
  const raw = await handleResponse<unknown>(response);
  const data = ActiveSprintEnvelopeSchema.parse(raw);
  return data.sprint as Sprint | null;
};

export const createSprint = async (
  projectId: string,
  payload: CreateSprintPayload
): Promise<Sprint> => {
  const response = await apiClient.post(API_ENDPOINTS.ENGINE_SPRINTS(projectId), payload);
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
    API_ENDPOINTS.ENGINE_SPRINT_COMPLETE(projectId, sprintId),
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
    ? `${API_ENDPOINTS.ENGINE_REASONINGS(projectId)}?${query}`
    : API_ENDPOINTS.ENGINE_REASONINGS(projectId);
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
    API_ENDPOINTS.ENGINE_REASONING_BY_ID(projectId, reasoningId)
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
    API_ENDPOINTS.ENGINE_REASONING_ACTION_ITEMS(projectId, reasoningId)
  );
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningActionItemsListSchema.parse(raw);
  return data.actionItems as ReasoningActionItem[];
};

export const createReasoning = async (
  projectId: string,
  payload: CreateReasoningPayload
): Promise<Reasoning> => {
  const response = await apiClient.post(API_ENDPOINTS.ENGINE_REASONINGS(projectId), payload);
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
    API_ENDPOINTS.ENGINE_REASONING_INTERACTION(projectId, reasoningId),
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
    API_ENDPOINTS.ENGINE_REASONING_ACTION_ITEM(projectId, reasoningId, itemId),
    payload
  );
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningActionItemEnvelopeSchema.parse(raw);
  return data.actionItem as ReasoningActionItem;
};
