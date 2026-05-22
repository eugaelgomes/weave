import { apiClient, API_ENDPOINTS, handleResponse } from "@/app/_services/api-methods";
import {
  ReasoningActionItemEnvelopeSchema,
  ReasoningActionItemsEnvelopeSchema,
  ReasoningContentEnvelopeSchema,
  ReasoningCreateEnvelopeSchema,
  ReasoningInteractionEnvelopeSchema,
  ReasoningsListEnvelopeSchema,
  type ReasoningActionItem,
  type ReasoningContent,
  type ReasoningLean,
} from "./reasonings.schema";

export type ReasoningTypeFilter = string;

export type FetchProjectReasoningsOptions = {
  sprintId?: string | null;
  reasoningType?: ReasoningTypeFilter | null;
  limit?: number | null;
};

export type CreateReasoningPayload = {
  sprintId: string;
  reasoningType: string;
  title: string;
  content?: Record<string, unknown>;
  options?: Record<string, unknown>;
};

export type UpdateReasoningInteractionPayload = {
  isRead?: boolean;
  isDismissed?: boolean;
  isPinned?: boolean;
  feedback?: string | null;
};

export type UpdateReasoningActionItemPayload = {
  isCompleted?: boolean;
  assignedTo?: string | null;
  priority?: string | null;
};

export type TriggerReasoningPayload = {
  reasoningType?: string;
  sprintId?: string;
  title?: string;
};

export async function fetchProjectReasonings(
  projectId: string,
  options: FetchProjectReasoningsOptions = {}
): Promise<ReasoningLean[]> {
  const params = new URLSearchParams();
  if (options.sprintId) params.set("sprintId", options.sprintId);
  if (options.reasoningType) params.set("reasoningType", options.reasoningType);
  if (typeof options.limit === "number") params.set("limit", String(options.limit));

  const qs = params.toString();
  const endpoint = qs
    ? `${API_ENDPOINTS.PROJECTS_REASONINGS(projectId)}?${qs}`
    : API_ENDPOINTS.PROJECTS_REASONINGS(projectId);

  const response = await apiClient.get(endpoint);
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningsListEnvelopeSchema.parse(raw);
  return data.reasonings as ReasoningLean[];
}

export async function fetchReasoningById(
  projectId: string,
  reasoningId: string
): Promise<ReasoningContent> {
  const response = await apiClient.get(
    API_ENDPOINTS.PROJECTS_REASONING_BY_ID(projectId, reasoningId)
  );
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningContentEnvelopeSchema.parse(raw);
  return data.reasoning as ReasoningContent;
}

export async function fetchReasoningActionItems(
  projectId: string,
  reasoningId: string
): Promise<ReasoningActionItem[]> {
  const response = await apiClient.get(
    API_ENDPOINTS.PROJECTS_REASONING_ACTION_ITEMS(projectId, reasoningId)
  );
  const raw = await handleResponse<unknown>(response);
  const data = ReasoningActionItemsEnvelopeSchema.parse(raw);
  return data.actionItems as ReasoningActionItem[];
}

export async function createReasoning(projectId: string, payload: CreateReasoningPayload) {
  const response = await apiClient.post(API_ENDPOINTS.PROJECTS_REASONINGS(projectId), payload);
  const raw = await handleResponse<unknown>(response);
  return ReasoningCreateEnvelopeSchema.parse(raw);
}

export async function triggerReasoning(projectId: string, payload: TriggerReasoningPayload = {}) {
  const response = await apiClient.post(
    API_ENDPOINTS.PROJECTS_REASONINGS_TRIGGER(projectId),
    payload
  );
  return handleResponse<unknown>(response);
}

export async function updateReasoningInteraction(
  projectId: string,
  reasoningId: string,
  payload: UpdateReasoningInteractionPayload
) {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_REASONING_INTERACTION(projectId, reasoningId),
    payload
  );
  const raw = await handleResponse<unknown>(response);
  return ReasoningInteractionEnvelopeSchema.parse(raw);
}

export async function updateReasoningActionItem(
  projectId: string,
  reasoningId: string,
  itemId: string,
  payload: UpdateReasoningActionItemPayload
) {
  const response = await apiClient.patch(
    API_ENDPOINTS.PROJECTS_REASONING_ACTION_ITEM(projectId, reasoningId, itemId),
    payload
  );
  const raw = await handleResponse<unknown>(response);
  return ReasoningActionItemEnvelopeSchema.parse(raw);
}
