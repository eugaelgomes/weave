import { z } from "zod";
import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";
import {
  AgentEnvelopeSchema,
  AgentProvidersResponseSchema,
  AgentsListSchema,
  ChatHistoryMessagesSchema,
  ChatHistorySessionsSchema,
  ChatPostResultSchema,
  RawChatMessageSchema,
  RawChatSessionSchema,
  RawModelsResponseSchema,
} from "./ai-agent.schema";
import { notifyPlanLimitExceededSync } from "../plan-limit-sync";

export interface AIModel {
  id: string;
  name: string;
  version: string;
  provider: string;
  description: string;
  logoUrl?: string | null;
  capabilities: string[];
  isAvailable: boolean;
}

export interface ChatModelSelection {
  name: string;
  version?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  created_at?: string;
  model?: string;
  sessionId?: string;
  citations?: unknown[];
  functions?: Array<{ name: string; arguments?: Record<string, unknown> }>;
  functionExecution?: Array<{ name: string; success: boolean; result?: unknown }>;
  provider?: string;
  metadata?: Record<string, any>;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface SendMessageData {
  message: string;
  model: ChatModelSelection;
  requestId?: string;
  sessionId?: string;
  noteIds?: string[];
  projectIds?: string[];
  files?: File[];
  agentId?: string;
  allowEdit?: boolean;
  allowWebSearch?: boolean;
  useCase?: string;
  context?: Record<string, any>;
}

export interface SendMessageResult {
  message: ChatMessage;
  sessionId: string;
  model?: ChatModelSelection;
  provider?: string;
  functions?: Array<{ name: string; arguments?: Record<string, unknown> }>;
  functionExecution?: Array<{ name: string; success: boolean; result?: unknown }>;
  citations?: unknown[];
}

export interface GenerateContentData {
  useCase: string;
  prompt: string;
  context?: Record<string, any>;
  provider?: string;
}

type RawModelItem = {
  id: string;
  name: string;
  version: string;
  contextWindow?: number | null;
  features?: string[];
  tags?: string[];
  deprecated?: boolean;
  supportedForAgents?: boolean;
};

type RawModelsResponse = {
  providers?: Array<{
    id?: string;
    name: string;
    isDefault?: boolean;
    logoUrl?: string | null;
    models?: RawModelItem[];
  }>;
};

export interface KnowledgeFile {
  original_name: string;
  url: string;
  mime_type: string;
  size: number;
  uploaded_at: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  instructions: string;
  role?: string;
  tone?: string;
  language?: string;
  avatar_url?: string;
  tags?: string[];
  tools?: string[];
  model_provider: string;
  model_name: string;
  knowledge_files?: KnowledgeFile[];
  is_public: boolean;
  user_id?: string;
  project_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAgentData {
  name: string;
  description: string;
  instructions: string;
  role?: string;
  tone?: string;
  language?: string;
  avatar_url?: string;
  tags?: string[];
  tools?: string[];
  model_provider: string;
  model_name: string;
  knowledge_files?: File[];
  project_id?: string | null;
  is_active?: boolean;
}

type RawChatMessage = {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  model?: string;
  session_id?: string;
  metadata?: Record<string, any>;
};

type RawChatSession = {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  message_count?: string | number;
};

function normalizeChatMessage(message: RawChatMessage): ChatMessage {
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
    timestamp: message.created_at ? new Date(message.created_at) : new Date(),
    created_at: message.created_at,
    model: message.model,
    sessionId: message.session_id,
    metadata: message.metadata,
  };
}

function normalizeChatSession(session: RawChatSession): ChatSession {
  return {
    id: session.id,
    title: session.title,
    createdAt: session.created_at ? new Date(session.created_at) : new Date(),
    updatedAt: session.updated_at ? new Date(session.updated_at) : new Date(),
    messageCount: Number(session.message_count || 0),
  };
}

/**
 * Processes the HTTP Response stream for Server-Sent Events (SSE) from the chat API.
 * It decodes the text chunks, splits them into SSE events, and parses the final data payload.
 *
 * @param {Response} response - The raw Fetch Response object.
 * @returns {Promise<SendMessageResult>} A promise resolving to the final structured chat message result.
 * @throws {Error} Throws an error if the stream cannot be read or if the server sends an error event.
 */
async function processChatResponse(
  response: Response,
  onChunk?: (chunk: string) => void
): Promise<SendMessageResult> {
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    await handleResponse(response);
  }

  let resultData: any = null;

  if (!contentType.includes("text/event-stream")) {
    resultData = await handleResponse<unknown>(response);
  } else {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to read the server response as a stream.");
    }

    const decoder = new TextDecoder();
    let errorData: any = null;
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\\n\\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const lines = part.split("\\n");
        let currentEvent = "message";

        for (const line of lines) {
          if (line.startsWith(":")) continue;
          if (line.startsWith("event: ")) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.substring(6).trim();
            if (!dataStr) continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (currentEvent === "error") {
                errorData = parsed;
              } else {
                if (parsed.chunk !== undefined) {
                  if (onChunk) onChunk(parsed.chunk);
                } else {
                  resultData = parsed;
                }
              }
            } catch (e) {
              console.error("[weave-ai/chat] Failed to parse SSE data block", {
                data: dataStr,
                error: e,
              });
            }
          }
        }
      }
    }

    if (errorData) {
      const errorMsg = errorData.error?.message || "Chat processing failed.";
      const apiError = new Error(errorMsg);
      (apiError as any).code = errorData.error?.code;

      // Handle plan limit explicitly for SSE errors so it behaves like the normal JSON path
      if (errorData.error?.code === "PLAN_LIMIT_EXCEEDED") {
        notifyPlanLimitExceededSync();
      }
      throw apiError;
    }

    if (!resultData) {
      throw new Error("No data returned from chat stream.");
    }
  }

  const result = ChatPostResultSchema.parse(resultData);

  const assistantMessage: ChatMessage = {
    id: `${result.sessionId}-assistant-${Date.now()}`,
    role: "assistant",
    content: result.response?.content || "",
    timestamp: new Date(),
    sessionId: result.sessionId,
    citations: result.response?.citations || [],
    functions: result.response?.functions || [],
    functionExecution: result.response?.functionExecution || [],
    provider: result.response?.provider || undefined,
    metadata: {
      citations: result.response?.citations || [],
      functions: result.response?.functions || [],
      functionExecution: result.response?.functionExecution || [],
      provider: result.response?.provider || null,
    },
  };

  return {
    sessionId: result.sessionId,
    message: assistantMessage,
    model: result.response?.model
      ? { name: result.response.model.name, version: result.response.model.version || undefined }
      : undefined,
    provider: result.response?.provider || undefined,
    citations: result.response?.citations || [],
    functions: result.response?.functions || [],
    functionExecution: result.response?.functionExecution || [],
  };
}

export async function fetchAvailableModels(): Promise<AIModel[]> {
  const response = await apiClient.get(API_ENDPOINTS.AI_MODELS);
  const raw = await handleResponse<unknown>(response);
  const data = RawModelsResponseSchema.parse(raw) as RawModelsResponse;
  const providers = Array.isArray(data.providers) ? data.providers : [];

  const models: AIModel[] = [];
  for (const providerEntry of providers) {
    const provider = String(providerEntry.name || "").toLowerCase();
    const providerLogoUrl = providerEntry.logoUrl || null;
    const providerModels = Array.isArray(providerEntry.models) ? providerEntry.models : [];

    for (const modelItem of providerModels) {
      const version = String(modelItem?.version || "").trim();
      if (!version) continue;

      models.push({
        id: modelItem?.id || `${provider}:${version}`,
        name: String(modelItem?.name || provider),
        version,
        provider,
        description: String(modelItem?.name || version),
        logoUrl: providerLogoUrl,
        capabilities: modelItem?.features || [],
        isAvailable: !modelItem?.deprecated,
      });
    }
  }

  return models;
}

/**
 * Sends a chat message to the Weave AI API.
 * Uses Server-Sent Events (SSE) to handle potentially long-running requests without network timeouts.
 *
 * @param {SendMessageData} data - The payload containing the message, model details, files, and context.
 * @returns {Promise<SendMessageResult>} A promise resolving to the final structured assistant response.
 */
export async function sendChatMessage(
  data: SendMessageData,
  onChunk?: (chunk: string) => void
): Promise<SendMessageResult> {
  const payload = {
    message: data.message,
    model: data.model,
    requestId: data.requestId,
    sessionId: data.sessionId,
    noteIds: data.noteIds,
    projectIds: data.projectIds,
    agentId: data.agentId,
    allowEdit: data.allowEdit,
    allowWebSearch: data.allowWebSearch,
    useCase: data.useCase,
    context: data.context,
  };

  if (Array.isArray(data.files) && data.files.length > 0) {
    const formData = new FormData();
    formData.append("message", data.message);
    formData.append("model", JSON.stringify(data.model));
    if (data.requestId) formData.append("requestId", data.requestId);
    if (data.sessionId) formData.append("sessionId", data.sessionId);
    if (data.agentId) formData.append("agentId", data.agentId);
    formData.append("allowEdit", String(Boolean(data.allowEdit)));
    formData.append("allowWebSearch", String(Boolean(data.allowWebSearch)));
    if (data.context) formData.append("context", JSON.stringify(data.context));
    if (Array.isArray(data.noteIds) && data.noteIds.length > 0) {
      formData.append("noteIds", JSON.stringify(data.noteIds));
    }
    if (Array.isArray(data.projectIds) && data.projectIds.length > 0) {
      formData.append("projectIds", JSON.stringify(data.projectIds));
    }
    data.files.forEach((file) => formData.append("files", file));

    const response = await apiClient.post(API_ENDPOINTS.AI_CHAT, formData);
    return processChatResponse(response, onChunk);
  }

  const response = await apiClient.post(API_ENDPOINTS.AI_CHAT, payload);
  return processChatResponse(response, onChunk);
}

export async function fetchChatHistory(
  sessionId?: string,
  limit?: number,
  offset?: number
): Promise<ChatMessage[] | ChatSession[]> {
  let endpoint = sessionId
    ? `${API_ENDPOINTS.AI_CHAT_HISTORY}?sessionId=${sessionId}`
    : API_ENDPOINTS.AI_CHAT_HISTORY;

  if (!sessionId) {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append("limit", String(limit));
    if (offset !== undefined) params.append("offset", String(offset));
    const queryString = params.toString();
    if (queryString) {
      endpoint += (endpoint.includes("?") ? "&" : "?") + queryString;
    }
  }

  const response = await apiClient.get(endpoint);

  if (sessionId) {
    const raw = await handleResponse<unknown>(response);
    const data = ChatHistoryMessagesSchema.parse(raw);
    return data.messages.map((m: z.infer<typeof RawChatMessageSchema>) =>
      normalizeChatMessage(m as RawChatMessage)
    );
  }
  const raw = await handleResponse<unknown>(response);
  const data = ChatHistorySessionsSchema.parse(raw);
  return data.sessions.map((s: z.infer<typeof RawChatSessionSchema>) =>
    normalizeChatSession(s as RawChatSession)
  );
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await apiClient.delete(API_ENDPOINTS.AI_CHAT_BY_ID(sessionId));
  const raw = await handleResponse<unknown>(response);
  z.record(z.string(), z.unknown()).parse(raw ?? {});
}

export async function generateContent(data: GenerateContentData): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_GENERATE, data);
  const raw = await handleResponse<unknown>(response);
  return z.unknown().parse(raw);
}

export async function analyzeNote(noteId: string, analysisType?: string): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_ANALYZE_NOTE, {
    noteId,
    analysisType,
  });
  const raw = await handleResponse<unknown>(response);
  return z.unknown().parse(raw);
}

export async function analyzeProject(projectId: string, analysisType?: string): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_ANALYZE_PROJECT, {
    projectId,
    analysisType,
  });
  const raw = await handleResponse<unknown>(response);
  return z.unknown().parse(raw);
}

export async function research(query: string, recencyFilter?: string): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_RESEARCH, {
    query,
    recencyFilter,
  });
  const raw = await handleResponse<unknown>(response);
  return z.unknown().parse(raw);
}

export interface AgentProviderResponse {
  id?: string;
  name: string;
  isDefault?: boolean;
  logoUrl?: string | null;
  models: RawModelItem[];
}

export async function fetchAgentProviders(): Promise<AgentProviderResponse[]> {
  const response = await apiClient.get(API_ENDPOINTS.AGENTS_PROVIDERS);
  const raw = await handleResponse<unknown>(response);
  const data = AgentProvidersResponseSchema.parse(raw);
  return data.providers as AgentProviderResponse[];
}

export async function listAgents(): Promise<Agent[]> {
  const response = await apiClient.get(API_ENDPOINTS.AGENTS);
  const raw = await handleResponse<unknown>(response);
  const data = AgentsListSchema.parse(raw);
  return data.agents as Agent[];
}

export async function createAgent(agentData: CreateAgentData): Promise<Agent> {
  const formData = new FormData();
  Object.entries(agentData).forEach(([key, value]) => {
    if (key === "knowledge_files" && Array.isArray(value)) {
      (value as File[]).forEach((file) => formData.append("knowledge_files", file));
    } else if ((key === "tags" || key === "tools") && Array.isArray(value)) {
      // Envia como JSON string para garantir parsing correto no backend ou array
      // Multer nao parseia arrays de campos texto automaticamente muito bem sem config especifica
      // Melhor enviar como JSON string num campo so se o backend suportar JSON.parse
      formData.append(key, JSON.stringify(value));
      // Se o backend espera tags[] teria que ser value.forEach...
      // Mas no controller eu coloquei JSON.parse(tools) entao JSON stringfy aqui eh o correto.
      // Para tags, o backend usa tags direto? normalizeAgentData usa tags.
      // Vamos checar se o controller parseia tags.
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const response = await apiClient.post(API_ENDPOINTS.AGENTS, formData);
  const raw = await handleResponse<unknown>(response);
  const data = AgentEnvelopeSchema.parse(raw);
  return data.agent as Agent;
}

export async function updateAgent(id: string, agentData: Partial<CreateAgentData>): Promise<Agent> {
  const formData = new FormData();
  Object.entries(agentData).forEach(([key, value]) => {
    if (key === "knowledge_files" && Array.isArray(value)) {
      (value as File[]).forEach((file) => formData.append("knowledge_files", file));
    } else if ((key === "tags" || key === "tools") && Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  const response = await apiClient.put(API_ENDPOINTS.AGENT_BY_ID(id), formData);
  const raw = await handleResponse<unknown>(response);
  const data = AgentEnvelopeSchema.parse(raw);
  return data.agent as Agent;
}

export async function deleteAgent(id: string): Promise<void> {
  const response = await apiClient.delete(API_ENDPOINTS.AGENT_BY_ID(id));
  const raw = await handleResponse<unknown>(response);
  z.record(z.string(), z.unknown()).parse(raw ?? {});
}

export async function shareAgent(
  id: string,
  sharedWith: { userId: string; permission: string }[]
): Promise<Agent> {
  const response = await apiClient.post(API_ENDPOINTS.AGENT_SHARE(id), { sharedWith });
  const raw = await handleResponse<unknown>(response);
  const data = AgentEnvelopeSchema.parse(raw);
  return data.agent as Agent;
}

export async function getAgentById(id: string): Promise<Agent> {
  const response = await apiClient.get(API_ENDPOINTS.AGENT_BY_ID(id));
  const raw = await handleResponse<unknown>(response);
  const data = AgentEnvelopeSchema.parse(raw);
  return data.agent as Agent;
}

export async function toggleAgentActive(id: string, is_active: boolean): Promise<Agent> {
  const response = await apiClient.patch(`${API_ENDPOINTS.AGENTS}/${id}/active`, { is_active });
  const raw = await handleResponse<unknown>(response);
  const data = AgentEnvelopeSchema.parse(raw);
  return data.agent as Agent;
}

export async function duplicateAgent(id: string): Promise<Agent> {
  const response = await apiClient.post(`${API_ENDPOINTS.AGENTS}/${id}/duplicate`, {});
  const raw = await handleResponse<unknown>(response);
  const data = AgentEnvelopeSchema.parse(raw);
  return data.agent as Agent;
}
