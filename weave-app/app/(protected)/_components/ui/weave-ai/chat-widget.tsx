"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, RefreshCw, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  fetchAvailableModels,
  sendChatMessage,
  type AIModel,
  type ChatMessage,
  type SendMessageData,
} from "@/app/_services/ai-agent-service/agent-service";
import { useAuth } from "@/app/_contexts/auth-context";

interface ChatWidgetProps {
  title?: string;
  maxHeight?: string;
  className?: string;
}

export default function ChatWidget({
  title = "Weave AI",
  maxHeight = "400px",
  className = "",
}: ChatWidgetProps) {
  const { user } = useAuth();
  const [models, setModels] = useState<AIModel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = await fetchAvailableModels();
        setModels(availableModels);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Erro ao carregar modelos");
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (models.length && !selectedModel) {
      setSelectedModel(models.find((m) => m.provider === "gemini") || models[0]);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isTyping) return;
    const value = input;
    setInput("");
    setIsTyping(true);
    setError(null);

    const requestId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticMessage: ChatMessage = {
      id: `widget-user-${requestId}`,
      role: "user",
      content: value,
      timestamp: new Date(),
      metadata: {
        requestId,
        status: "pending",
      },
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    const payload: SendMessageData = {
      message: value,
      model: {
        name: selectedModel.provider || selectedModel.name,
        version: selectedModel.version,
      },
      requestId,
      sessionId,
    };

    try {
      const response = await sendChatMessage(payload);
      setSessionId(response.sessionId || sessionId);
      setMessages((prev) =>
        prev
          .map((message) =>
            message.id === optimisticMessage.id
              ? {
                  ...message,
                  metadata: {
                    ...(message.metadata || {}),
                    status: "sent",
                  },
                }
              : message
          )
          .concat(response.message)
      );
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : "Erro ao enviar mensagem";
      setError(errorMessage);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticMessage.id
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
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      className={`dark:shadow-surface-dark-md dark:border-surface-dark-border flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 shadow-md dark:bg-[#1d1d1b] ${className}`}
    >
      {/* Header */}
      <div className="dark:border-surface-dark-border flex items-center justify-between border-b border-neutral-200 bg-neutral-100 px-4 py-3 dark:bg-[#1d1d1b]">
        <div className="flex items-center gap-2">
          <div className="bg-brand-primary-500/10 flex h-6 w-6 items-center justify-center rounded-md text-yellow-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{title}</h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setSessionId(undefined);
              setMessages([]);
              setError(null);
            }}
            className="rounded-md p-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Nova conversa"
          >
            <RefreshCw className="h-3.5 w-3.5 text-neutral-500" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800 flex-1 overflow-y-auto scroll-smooth p-4"
        style={{ maxHeight }}
      >
        {messages.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <MessageSquare className="mb-2 h-6 w-6 text-neutral-300 dark:text-neutral-700" />
            <p className="text-xs text-neutral-500">Como posso ajudar hoje?</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] ${
                    msg.role === "user"
                      ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      : "bg-teal-500 text-white"
                  }`}
                >
                  {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs shadow-sm ${
                    msg.role === "user"
                      ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                      : "dark:border-surface-dark-border border border-neutral-200 bg-white text-neutral-800 dark:bg-[#1d1d1b] dark:text-neutral-200"
                  }`}
                >
                  <div className="prose prose-invert max-w-none leading-relaxed text-inherit">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.role === "user" && msg?.metadata?.status === "failed" && (
                    <p className="mt-1 text-[10px] text-red-500">
                      {String(msg?.metadata?.errorMessage || "Falha ao enviar mensagem")}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-500 text-white">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="dark:border-surface-dark-border flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1 dark:bg-[#1d1d1b]">
                  <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400 [animation-delay:0.2s]" />
                  <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-400 [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="dark:border-surface-dark-border border-t border-neutral-200 bg-neutral-50 p-3 dark:bg-[#1d1d1b]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Perguntar..."
            className="dark:border-surface-dark-border-strong max-h-24 min-h-[36px] flex-1 resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs transition-all focus:border-yellow-500 focus:outline-none dark:bg-[#1d1d1b] dark:focus:border-yellow-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            title="Enviar mensagem"
            aria-label="Enviar mensagem"
            className="bg-brand-primary-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white transition-all hover:bg-yellow-600 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        {error ? <p className="mt-2 text-[11px] text-red-500">{error}</p> : null}
      </div>
    </div>
  );
}
