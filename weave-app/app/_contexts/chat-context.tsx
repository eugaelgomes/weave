"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./auth-context";
import {
  fetchAvailableModels,
  sendChatMessage,
  fetchChatHistory,
  deleteChatSession as deleteChatSessionService,
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
  retryMessage: (messageId: string) => Promise<ChatMessage | null>;
  loadChatHistory: (sessionId?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  createNewSession: () => void;
  deleteSession: (sessionId: string) => Promise<boolean>;
  setCurrentSession: (session: ChatSession | null) => void;
}

export type { AIModel, ChatMessage, SendMessageData, ChatSession };

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const DEFAULT_SESSION_TITLE = "Nova Conversa";

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function deriveSessionTitleFromMessages(messages: ChatMessage[]): string | null {
  const first = messages.find((m) => m.role === "user" && typeof m.content === "string");
  const raw = first?.content?.trim();
  if (!raw) return null;
  const firstLine = raw.split(/\n/).find((l) => l.trim().length > 0)?.trim() ?? raw;
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.length > 255 ? collapsed.slice(0, 255) : collapsed;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();
  /** Bumped on createNewSession and at the start of each loadSession / scoped loadChatHistory; stale async completions must not overwrite state. */
  const chatStateEpochRef = useRef(0);
  const [models, setModels] = useState<AIModel[]>([]);
  const [currentSession, setCurrentSessionState] = useState<ChatSession | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const chatHistoryRef = useRef<ChatSession[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

  const loadChatHistory = useCallback(
    async (sessionId?: string) => {
      if (!authenticated) return;

      const requestToken = sessionId ? ++chatStateEpochRef.current : null;

      try {
        setLoading(true);

        const response = await fetchChatHistory(sessionId);

        if (sessionId) {
          if (requestToken !== null && requestToken !== chatStateEpochRef.current) {
            return;
          }
          setMessages(response as ChatMessage[]);
        } else {
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

  const sendMessage = useCallback(
    async (data: SendMessageData): Promise<ChatMessage | null> => {
      if (!authenticated) return null;

      const epochAtSendStart = chatStateEpochRef.current;
      const requestId = data.requestId || createRequestId();
      const optimisticMessageId = `user-${requestId}`;

      try {
        setIsTyping(true);
        setError(null);

        const userMessage: ChatMessage = {
          id: optimisticMessageId,
          role: "user",
          content: data.message,
          timestamp: new Date(),
          model: data.model.version ? `${data.model.name}:${data.model.version}` : data.model.name,
          metadata: {
            allowEdit: data.allowEdit,
            errorMessage: null,
            payload: {
              ...data,
              requestId,
            },
            requestId,
            status: "pending",
          },
        };

        setMessages((prev: ChatMessage[]) => {
          const existingIndex = prev.findIndex((message: ChatMessage) => message.id === optimisticMessageId);
          if (existingIndex >= 0) {
            const next = [...prev];
            next[existingIndex] = userMessage;
            return next;
          }
          return [...prev, userMessage];
        });

        const response = await sendChatMessage({
          ...data,
          requestId,
        });

        if (epochAtSendStart !== chatStateEpochRef.current) {
          return null;
        }

        setMessages((prev: ChatMessage[]) =>
          prev.map((message: ChatMessage) =>
            message.id === optimisticMessageId
              ? {
                  ...message,
                  metadata: {
                    ...(message.metadata || {}),
                    errorMessage: null,
                    status: "sent",
                  },
                }
              : message
          )
        );

        if (response?.message) {
          setMessages((prev: ChatMessage[]) => [...prev, response.message]);

          if (response.sessionId) {
            setCurrentSessionState((prev: ChatSession | null) => {
              if (prev?.id === response.sessionId) return prev;

              const existingSession = chatHistoryRef.current.find(
                (session: ChatSession) => session.id === response.sessionId
              );
              if (existingSession) return existingSession;

              return {
                id: response.sessionId,
                title: data.message.substring(0, 50) + (data.message.length > 50 ? "..." : ""),
                createdAt: new Date(),
                updatedAt: new Date(),
                messageCount: 2,
              };
            });

            await loadChatHistory();
          }
        }

        return response?.message || null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro ao enviar mensagem";
        setError(errorMessage);
        setMessages((prev: ChatMessage[]) =>
          prev.map((message: ChatMessage) =>
            message.id === optimisticMessageId
              ? {
                  ...message,
                  metadata: {
                    ...(message.metadata || {}),
                    errorMessage,
                    status: "failed",
                  },
                }
              : message
          )
        );
        console.error("Erro ao enviar mensagem:", err);
        return null;
      } finally {
        setIsTyping(false);
      }
    },
    [authenticated, loadChatHistory]
  );

  const retryMessage = useCallback(
    async (messageId: string): Promise<ChatMessage | null> => {
      const failedMessage = messagesRef.current.find(
        (message: ChatMessage) => message.id === messageId && message.role === "user"
      );
      const retryPayload = failedMessage?.metadata?.payload as SendMessageData | undefined;
      if (!retryPayload) {
        return null;
      }
      return sendMessage(retryPayload);
    },
    [sendMessage]
  );

  const loadSession = useCallback(
    async (sessionId: string) => {
      if (!authenticated) return;

      const requestToken = ++chatStateEpochRef.current;

      try {
        setLoading(true);
        setError(null);
        const history = await fetchChatHistory(sessionId);
        if (requestToken !== chatStateEpochRef.current) {
          return;
        }
        const list = history as ChatMessage[];
        setMessages(list);

        const derivedTitle = deriveSessionTitleFromMessages(list);
        const session = chatHistoryRef.current.find((s: ChatSession) => s.id === sessionId) || null;
        const isStaleDefaultTitle =
          session?.title === DEFAULT_SESSION_TITLE ||
          session?.title?.toLowerCase() === "nova conversa";

        if (session) {
          if (derivedTitle && isStaleDefaultTitle) {
            const updated = { ...session, title: derivedTitle };
            setCurrentSessionState(updated);
            setChatHistory((prev: ChatSession[]) =>
              prev.map((s: ChatSession) => (s.id === sessionId ? { ...s, title: derivedTitle } : s))
            );
          } else {
            setCurrentSessionState(session);
          }
        } else {
          setCurrentSessionState({
            id: sessionId,
            title: derivedTitle ?? "Conversa",
            createdAt: new Date(),
            updatedAt: new Date(),
            messageCount: list.length,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar sessão");
        console.error("Erro ao carregar sessão:", err);
      } finally {
        setLoading(false);
      }
    },
    [authenticated]
  );

  const createNewSession = useCallback(() => {
    chatStateEpochRef.current += 1;
    setCurrentSessionState(null);
    setMessages([]);
    setError(null);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!authenticated) return false;

      try {
        setError(null);
        await deleteChatSessionService(sessionId);

        chatStateEpochRef.current += 1;

        setChatHistory((prev: ChatSession[]) => prev.filter((session: ChatSession) => session.id !== sessionId));

        setCurrentSessionState((prev: ChatSession | null) => (prev?.id === sessionId ? null : prev));
        setMessages((prev: ChatMessage[]) =>
          currentSession?.id === sessionId ? [] : prev
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir conversa");
        return false;
      }
    },
    [authenticated, currentSession?.id]
  );

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
    retryMessage,
    loadChatHistory,
    loadSession,
    createNewSession,
    deleteSession,
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
