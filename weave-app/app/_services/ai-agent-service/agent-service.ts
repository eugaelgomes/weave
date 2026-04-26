import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-methods";

export interface AIModel {
  id: string;
  name: string;
  provider: "gemini" | "perplexity";
  description: string;
  capabilities: string[];
  useCases: string[];
  isAvailable: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  created_at?: string;
  model?: string;
  sessionId?: string;
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
  model: string;
  sessionId?: string;
  allowEdit?: boolean;
  useCase?: string;
  context?: Record<string, any>;
}

export interface GenerateContentData {
  useCase: string;
  prompt: string;
  context?: Record<string, any>;
  provider?: string;
}

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

export async function fetchAvailableModels(): Promise<AIModel[]> {
  const response = await apiClient.get(API_ENDPOINTS.AI_MODELS);
  const data = await handleResponse<{ models: AIModel[] }>(response);
  return data.models;
}

export async function sendChatMessage(data: SendMessageData): Promise<ChatMessage> {
  const response = await apiClient.post(API_ENDPOINTS.AI_CHAT, data);
  const result = await handleResponse<{ message: ChatMessage }>(response);
  return result.message;
}

export async function fetchChatHistory(sessionId?: string): Promise<ChatMessage[] | ChatSession[]> {
  const endpoint = sessionId
    ? `${API_ENDPOINTS.AI_CHAT_HISTORY}?sessionId=${sessionId}`
    : API_ENDPOINTS.AI_CHAT_HISTORY;

  const response = await apiClient.get(endpoint);

  if (sessionId) {
    // Retorna mensagens de uma sessão específica
    const data = await handleResponse<{ messages: ChatMessage[] }>(response);
    return data.messages;
  } else {
    // Retorna lista de sessões
    const data = await handleResponse<{ sessions: ChatSession[] }>(response);
    return data.sessions;
  }
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
