"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./auth-context";
import {
  fetchAvailableModels,
  sendChatMessage,
  fetchChatHistory,
  type AIModel,
  type ChatMessage,
  type SendMessageData,
  type ChatSession,
} from "../_services/ai-agent-service/agent-service";

export interface ChatContextType {
  // Estado
  models: AIModel[];
  currentSession: ChatSession | null;
  chatHistory: ChatSession[];
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  isTyping: boolean;

  // Funções
  loadModels: () => Promise<void>;
  sendMessage: (data: SendMessageData) => Promise<ChatMessage | null>;
  loadChatHistory: (sessionId?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  createNewSession: () => void;
  setCurrentSession: (session: ChatSession | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  const [models, setModels] = useState<AIModel[]>([]);
  const [currentSession, setCurrentSessionState] = useState<ChatSession | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Carrega lista de sessões quando autenticado
  useEffect(() => {
    if (authenticated) {
      loadChatHistory();
    }
  }, [authenticated]);

  const loadModels = useCallback(async () => {
    if (!authenticated) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchAvailableModels();
      setModels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar modelos");
      console.error("Erro ao carregar modelos:", err);
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  const sendMessage = useCallback(
    async (data: SendMessageData): Promise<ChatMessage | null> => {
      if (!authenticated) return null;

      try {
        setIsTyping(true);
        setError(null);

        const userMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "user",
          content: data.message,
          timestamp: new Date(),
          model: data.model,
          metadata: {
            allowEdit: data.allowEdit,
            useCase: data.useCase,
          },
        };

        setMessages((prev) => [...prev, userMessage]);

        const response = await sendChatMessage(data);

        if (response) {
          setMessages((prev) => [...prev, response]);
        }

        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar mensagem");
        console.error("Erro ao enviar mensagem:", err);
        return null;
      } finally {
        setIsTyping(false);
      }
    },
    [authenticated]
  );

  const loadChatHistory = useCallback(
    async (sessionId?: string) => {
      if (!authenticated) return;

      try {
        setLoading(true);

        const response = await fetchChatHistory(sessionId);

        if (sessionId) {
          // Resposta é array de mensagens
          setMessages(response as ChatMessage[]);
        } else {
          // Resposta é array de sessões
          setChatHistory(response as ChatSession[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar histórico");
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoading(false);
      }
    },
    [authenticated]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      if (!authenticated) return;

      try {
        setLoading(true);
        setError(null);
        const history = await fetchChatHistory(sessionId);
        setMessages(history as ChatMessage[]);

        // Atualiza a sessão atual
        const session = chatHistory.find((s) => s.id === sessionId);
        if (session) {
          setCurrentSessionState(session);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar sessão");
        console.error("Erro ao carregar sessão:", err);
      } finally {
        setLoading(false);
      }
    },
    [authenticated, chatHistory]
  );

  const createNewSession = useCallback(() => {
    setCurrentSessionState(null);
    setMessages([]);
    setError(null);
  }, []);

  const setCurrentSession = useCallback(
    (session: ChatSession | null) => {
      setCurrentSessionState(session);
      if (session) {
        loadChatHistory(session.id);
      }
    },
    [loadChatHistory]
  );

  const value: ChatContextType = {
    models,
    currentSession,
    chatHistory,
    messages,
    loading,
    error,
    isTyping,
    loadModels,
    sendMessage,
    loadChatHistory,
    loadSession,
    createNewSession,
    setCurrentSession,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat deve ser usado dentro de ChatProvider");
  }
  return context;
}
