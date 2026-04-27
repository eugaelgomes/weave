import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";

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
  sessionId?: string;
  noteIds?: string[];
  projectIds?: string[];
  files?: File[];
  agentId?: string;
  allowEdit?: boolean;
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

type RawModelsResponse = {
  providers?: Array<{
    name: string;
    logoUrl?: string | null;
    models: Record<string, string>;
    modelEntries?: Array<{
      key: string;
      version: string;
      logoUrl?: string | null;
    }>;
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

export async function fetchAvailableModels(): Promise<AIModel[]> {
  const response = await apiClient.get(API_ENDPOINTS.AI_MODELS);
  const data = await handleResponse<RawModelsResponse>(response);
  const providers = Array.isArray(data.providers) ? data.providers : [];

  const models: AIModel[] = [];
  for (const providerEntry of providers) {
    const provider = String(providerEntry.name || "").toLowerCase();
    const providerLogoUrl = providerEntry.logoUrl || null;
    const modelEntries = Array.isArray(providerEntry.modelEntries)
      ? providerEntry.modelEntries
      : [];

    if (modelEntries.length > 0) {
      for (const modelEntry of modelEntries) {
        const version = String(modelEntry?.version || "").trim();
        if (!version) {
          continue;
        }

        models.push({
          id: `${provider}:${version}`,
          name: provider,
          version,
          provider,
          description: String(modelEntry?.key || "").trim() || version,
          logoUrl: modelEntry?.logoUrl || providerLogoUrl,
          capabilities: [],
          isAvailable: true,
        });
      }
      continue;
    }

    const providerModels = providerEntry.models || {};
    for (const [modelLabel, modelVersion] of Object.entries(providerModels)) {
      const version = String(modelVersion || "").trim();
      if (!version) {
        continue;
      }
      models.push({
        id: `${provider}:${version}`,
        name: provider,
        version,
        provider,
        description: modelLabel,
        logoUrl: providerLogoUrl,
        capabilities: [],
        isAvailable: true,
      });
    }
  }

  return models;
}

export async function sendChatMessage(data: SendMessageData): Promise<SendMessageResult> {
  const payload = {
    message: data.message,
    model: data.model,
    sessionId: data.sessionId,
    noteIds: data.noteIds,
    projectIds: data.projectIds,
    agentId: data.agentId,
    allowEdit: data.allowEdit,
    useCase: data.useCase,
    context: data.context,
  };

  if (Array.isArray(data.files) && data.files.length > 0) {
    const formData = new FormData();
    formData.append("message", data.message);
    formData.append("model", JSON.stringify(data.model));
    if (data.sessionId) formData.append("sessionId", data.sessionId);
    if (data.agentId) formData.append("agentId", data.agentId);
    formData.append("allowEdit", String(Boolean(data.allowEdit)));
    if (data.context) formData.append("context", JSON.stringify(data.context));
    if (Array.isArray(data.noteIds) && data.noteIds.length > 0) {
      formData.append("noteIds", JSON.stringify(data.noteIds));
    }
    if (Array.isArray(data.projectIds) && data.projectIds.length > 0) {
      formData.append("projectIds", JSON.stringify(data.projectIds));
    }
    data.files.forEach((file) => formData.append("files", file));

    const response = await apiClient.post(API_ENDPOINTS.AI_CHAT, formData);
    const result = await handleResponse<{
      sessionId: string;
      response: {
        role: "assistant";
        content: string;
        citations?: unknown[];
        functions?: Array<{ name: string; arguments?: Record<string, unknown> }>;
        functionExecution?: Array<{ name: string; success: boolean; result?: unknown }>;
        model?: ChatModelSelection;
        provider?: string;
      };
    }>(response);

    const assistantMessage: ChatMessage = {
      id: `${result.sessionId}-assistant-${Date.now()}`,
      role: "assistant",
      content: result.response?.content || "",
      timestamp: new Date(),
      sessionId: result.sessionId,
      citations: result.response?.citations || [],
      functions: result.response?.functions || [],
      functionExecution: result.response?.functionExecution || [],
      provider: result.response?.provider,
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
      model: result.response?.model,
      provider: result.response?.provider,
      citations: result.response?.citations || [],
      functions: result.response?.functions || [],
      functionExecution: result.response?.functionExecution || [],
    };
  }

  const response = await apiClient.post(API_ENDPOINTS.AI_CHAT, payload);
  const result = await handleResponse<{
    sessionId: string;
    response: {
      role: "assistant";
      content: string;
      citations?: unknown[];
      functions?: Array<{ name: string; arguments?: Record<string, unknown> }>;
      functionExecution?: Array<{ name: string; success: boolean; result?: unknown }>;
      model?: ChatModelSelection;
      provider?: string;
    };
  }>(response);

  const assistantMessage: ChatMessage = {
    id: `${result.sessionId}-assistant-${Date.now()}`,
    role: "assistant",
    content: result.response?.content || "",
    timestamp: new Date(),
    sessionId: result.sessionId,
    citations: result.response?.citations || [],
    functions: result.response?.functions || [],
    functionExecution: result.response?.functionExecution || [],
    provider: result.response?.provider,
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
    model: result.response?.model,
    provider: result.response?.provider,
    citations: result.response?.citations || [],
    functions: result.response?.functions || [],
    functionExecution: result.response?.functionExecution || [],
  };
}

export async function fetchChatHistory(sessionId?: string): Promise<ChatMessage[] | ChatSession[]> {
  const endpoint = sessionId
    ? `${API_ENDPOINTS.AI_CHAT_HISTORY}?sessionId=${sessionId}`
    : API_ENDPOINTS.AI_CHAT_HISTORY;

  const response = await apiClient.get(endpoint);

  if (sessionId) {
    // Retorna mensagens de uma sessão específica
    const data = await handleResponse<{ messages: RawChatMessage[] }>(response);
    return data.messages.map(normalizeChatMessage);
  } else {
    // Retorna lista de sessões
    const data = await handleResponse<{ sessions: RawChatSession[] }>(response);
    return data.sessions.map(normalizeChatSession);
  }
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await apiClient.delete(API_ENDPOINTS.AI_CHAT_BY_ID(sessionId));
  await handleResponse(response);
}

export async function generateContent(data: GenerateContentData): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_GENERATE, data);
  return await handleResponse(response);
}

export async function analyzeNote(noteId: string, analysisType?: string): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_ANALYZE_NOTE, {
    noteId,
    analysisType,
  });
  return await handleResponse(response);
}

export async function analyzeProject(projectId: string, analysisType?: string): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_ANALYZE_PROJECT, {
    projectId,
    analysisType,
  });
  return await handleResponse(response);
}

export async function research(query: string, recencyFilter?: string): Promise<any> {
  const response = await apiClient.post(API_ENDPOINTS.AI_RESEARCH, {
    query,
    recencyFilter,
  });
  return await handleResponse(response);
}

export interface AgentProviderResponse {
  name: string;
  models: Record<string, string>;
}

export async function fetchAgentProviders(): Promise<AgentProviderResponse[]> {
  const response = await apiClient.get(API_ENDPOINTS.AGENTS_PROVIDERS);
  const data = await handleResponse<{ providers: AgentProviderResponse[] }>(response);
  return data.providers;
}

export async function listAgents(): Promise<Agent[]> {
  const response = await apiClient.get(API_ENDPOINTS.AGENTS);
  const data = await handleResponse<{ agents: Agent[] }>(response);
  return data.agents;
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
  const data = await handleResponse<{ agent: Agent }>(response);
  return data.agent;
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
  const data = await handleResponse<{ agent: Agent }>(response);
  return data.agent;
}

export async function deleteAgent(id: string): Promise<void> {
  const response = await apiClient.delete(API_ENDPOINTS.AGENT_BY_ID(id));
  await handleResponse(response);
}

export async function shareAgent(
  id: string,
  sharedWith: { userId: string; permission: string }[]
): Promise<Agent> {
  const response = await apiClient.post(API_ENDPOINTS.AGENT_SHARE(id), { sharedWith });
  const data = await handleResponse<{ agent: Agent }>(response);
  return data.agent;
}

export async function getAgentById(id: string): Promise<Agent> {
  const response = await apiClient.get(API_ENDPOINTS.AGENT_BY_ID(id));
  const data = await handleResponse<{ agent: Agent }>(response);
  return data.agent;
}
