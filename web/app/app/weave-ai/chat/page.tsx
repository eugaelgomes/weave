"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  Bot,
  User,
  MoreVertical,
  Plus,
  MessageSquare,
  Menu,
  X,
  Copy,
  Sparkles,
  ChevronDown,
  Globe,
  Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useChat } from "@/app/contexts/ChatContext";
import { useAuth } from "@/app/contexts/AuthContext";
import type { AIModel } from "@/app/services/ai-agent-service/agent-servevice";
import "highlight.js/styles/github-dark.css";
import Image from "next/image";

/* -------------------------------- Icons -------------------------------- */

const ModelIcon = ({ provider }: { provider?: string }) => {
  if (provider === "perplexity") return <Globe className="h-4 w-4 text-blue-500" />;
  return <Sparkles className="h-4 w-4 text-yellow-500" />;
};

const HistoryItem = ({
  title,
  active,
  onClick,
}: {
  title: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
      active
        ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
    }`}
  >
    <div className="flex items-center gap-2">
      <MessageSquare className="h-4 w-4 opacity-60" />
      <span className="truncate">{title}</span>
    </div>
  </button>
);

/* -------------------------------- Page -------------------------------- */

export default function ChatPage() {
  const {
    models,
    messages,
    loading,
    error,
    isTyping,
    loadModels,
    sendMessage,
    createNewSession,
    currentSession,
    chatHistory,
    loadSession,
  } = useChat();

  const { user } = useAuth();

  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ------------------------------- Effects ------------------------------- */

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    if (models.length && !selectedModel) {
      setSelectedModel(models.find((m) => m.provider === "gemini") || models[0]);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reseta a altura momentaneamente para 'auto' para obter o scrollHeight correto
      // caso o usuário apague texto
      textarea.style.height = "auto";

      // Define a nova altura baseada no conteúdo
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  /* ------------------------------ Handlers ------------------------------ */

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isTyping) return;
    const value = input;
    setInput("");
    await sendMessage({
      message: value,
      model: selectedModel.id,
      sessionId: currentSession?.id,
    });
  };

  /* -------------------------------- Layout -------------------------------- */

  return (
    <div className="h-full w-full bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="grid h-full grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* ============================ SIDEBAR DESKTOP ============================ */}
        {/* Trocado aside por div */}
        <div className="hidden border-r border-neutral-200 bg-neutral-50 md:flex md:flex-col dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="text-sm font-semibold text-neutral-500">Conversas</span>
            <button onClick={createNewSession}>
              <Plus className="h-4 w-4 opacity-70" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {chatHistory?.length ? (
              chatHistory.map((chat: any) => (
                <HistoryItem
                  key={chat.id}
                  title={chat.title || "Nova conversa"}
                  active={currentSession?.id === chat.id}
                  onClick={() => loadSession?.(chat.id)}
                />
              ))
            ) : (
              <p className="px-4 py-8 text-center text-xs opacity-50">Nenhuma conversa ainda</p>
            )}
          </div>
        </div>

        {/* ============================ SIDEBAR MOBILE ============================ */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsSidebarOpen(false)} />
            <div className="relative h-full w-[85%] max-w-[300px] bg-neutral-50 dark:bg-neutral-900">
              <div className="flex h-14 items-center justify-between px-4">
                <span className="font-semibold">Conversas</span>
                <button onClick={() => setIsSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="px-2">
                <button
                  onClick={() => {
                    createNewSession();
                    setIsSidebarOpen(false);
                  }}
                  className="mb-3 w-full rounded-md bg-neutral-900 py-2 text-sm text-white dark:bg-white dark:text-neutral-900"
                >
                  Novo chat
                </button>
                {chatHistory?.map((chat: any) => (
                  <HistoryItem
                    key={chat.id}
                    title={chat.title || "Nova conversa"}
                    active={currentSession?.id === chat.id}
                    onClick={() => {
                      loadSession?.(chat.id);
                      setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================ MAIN AREA ============================ */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* HEADER -> Trocado header por div */}
          <div className="z-20 flex h-14 flex-shrink-0 items-center justify-between border-b border-neutral-200 bg-white/80 px-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
            <button className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>

            {/* MODEL SELECT */}
            <div className="relative">
              <button
                onClick={() => setIsModelMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <ModelIcon provider={selectedModel?.provider} />
                <span>{selectedModel?.name || "Modelo"}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </button>

              {isModelMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)} />
                  <div className="absolute z-20 mt-2 w-56 rounded-md border bg-white p-1 shadow dark:border-neutral-800 dark:bg-neutral-900">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model);
                          setIsModelMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <ModelIcon provider={model.provider} />
                        <span>{model.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <MoreVertical className="h-5 w-5 opacity-60" />
          </div>

          {/* CHAT CONTENT -> Trocado main por div */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="mx-auto w-full max-w-3xl space-y-4">
              {messages.length === 0 && !loading && (
                <div className="mt-24 text-center">
                  <h2 className="text-xl font-semibold">Nova conversa</h2>
                  <p className="mt-2 text-sm text-neutral-500">
                    Escolha um modelo e escreva sua pergunta abaixo.
                  </p>
                </div>
              )}

              {messages.map((msg) => {
                const model = models.find((m) => m.id === msg.model);
                const isUser = msg.role === "user";

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-md ${
                          isUser
                            ? "bg-gradient-to-br from-blue-500 to-purple-600"
                            : "bg-gradient-to-br from-green-400 to-blue-500"
                        }`}
                      >
                        {isUser ? (
                          user?.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt="User"
                              width={32}
                              height={32}
                              className="h-8 w-8 object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-white" />
                          )
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Message Content */}
                    <div className="max-w-[calc(100%-3rem)] flex-1 sm:max-w-[75%]">
                      <div
                        className={`rounded-md px-4 py-2 text-sm leading-relaxed ${
                          isUser
                            ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                            : "border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-sm dark:prose-invert prose-pre:bg-neutral-900 prose-pre:text-neutral-100 dark:prose-pre:bg-neutral-950 max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                code: ({ node, inline, className, children, ...props }: any) => {
                                  if (inline) {
                                    return (
                                      <code
                                        className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-800"
                                        {...props}
                                      >
                                        {children}
                                      </code>
                                    );
                                  }
                                  return (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                                pre: ({ children, ...props }: any) => (
                                  <pre
                                    className="overflow-x-auto rounded-md bg-neutral-900 p-4 text-sm dark:bg-neutral-950"
                                    {...props}
                                  >
                                    {children}
                                  </pre>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {!isUser && (
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="mt-1.5 ml-1 text-xs text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                        >
                          <Copy className="mr-1 inline h-3 w-3" /> copiar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-green-400 to-blue-500">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-md bg-neutral-400 [animation-delay:-0.3s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-md bg-neutral-400 [animation-delay:-0.15s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-md bg-neutral-400"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* INPUT AREA */}
          <div className="flex-shrink-0 bg-white/80 pt-2 pb-6 backdrop-blur dark:bg-neutral-950/80">
            <div className="mx-auto max-w-3xl px-4">
              <div className="relative flex items-end gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 shadow-sm transition-all duration-200 ease-in-out focus-within:border-neutral-300 focus-within:bg-white focus-within:shadow-md focus-within:ring-2 focus-within:ring-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:focus-within:border-neutral-700 dark:focus-within:bg-neutral-900 dark:focus-within:ring-neutral-800">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Envie uma mensagem para a IA..."
                  // AQUI: Adicionei 'overflow-hidden' para remover a barra feia enquanto cresce.
                  // Se passar de 200px (seu max-h), o overflow-y-auto entra em ação se você quiser,
                  // ou você pode adicionar uma classe condicional.
                  className="max-h-[200px] flex-1 resize-none overflow-hidden bg-transparent px-4 py-3 text-sm leading-relaxed placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100"
                  style={{ minHeight: "44px" }}
                />

                <button
                  title="send"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="mr-1 mb-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-neutral-900 text-white transition-all duration-200 hover:bg-black hover:shadow active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:shadow-none dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  <Send className="h-4 w-4 stroke-[2.5px]" />
                </button>
              </div>

              <div className="mt-2 text-center text-[10px] text-neutral-400 dark:text-neutral-600">
                A IA pode cometer erros. Considere verificar informações importantes.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
