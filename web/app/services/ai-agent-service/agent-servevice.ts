import { apiClient, handleResponse } from "../api-methods";
import { API_ENDPOINTS } from "../api-routes";

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
  context?: Record<string, any>;
}

export interface GenerateContentData {
  useCase: string;
  prompt: string;
  context?: Record<string, any>;
  provider?: string;
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
