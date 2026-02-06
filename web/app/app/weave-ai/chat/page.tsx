"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Plus,
  MessageSquare,
  Menu,
  X,
  Copy,
  Sparkles,
  ChevronDown,
  Globe,
  Lock,
  Unlock,
  Paperclip,
  FileText,
  FolderKanban,
  Activity,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useChat } from "@/app/contexts/ChatContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotes } from "@/app/contexts/NotesContext";
import { useProjects } from "@/app/contexts/ProjectsContext";
import { checkHealth, type HealthStatus } from "@/app/services";
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
    className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-all duration-200 ${
      active
        ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
        : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
    }`}
  >
    <MessageSquare
      className={`h-4 w-4 flex-shrink-0 transition-opacity ${active ? "opacity-100" : "opacity-50 group-hover:opacity-80"}`}
    />
    <span className="truncate">{title}</span>
  </button>
);

/* -------------------------------- Page -------------------------------- */

export default function ChatPage() {
  const {
    models,
    messages,
    loading,
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

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Chat configuration state
  const [allowEdit, setAllowEdit] = useState(false);
  const [selectedUseCase, setSelectedUseCase] = useState<string>("");

  // Context state (notas e projetos indexados)
  const [contextItems, setContextItems] = useState<
    Array<{
      type: "note" | "project";
      id: string;
      title: string;
    }>
  >([]);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Health status state
  const [healthStatus, setHealthStatus] = React.useState<HealthStatus | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks para buscar notas e projetos
  const { notesOverview } = useNotes();
  const { projectsOverview } = useProjects();

  // Use cases disponíveis (do backend)
  const useCases = [
    { value: "", label: "Automático" },
    { value: "chat", label: "Chat" },
    { value: "note_generation", label: "Gerar Nota" },
    { value: "note_summarization", label: "Resumir Nota" },
    { value: "content_enhancement", label: "Melhorar Conteúdo" },
    { value: "tag_suggestion", label: "Sugerir Tags" },
    { value: "project_creation", label: "Criar Projeto" },
    { value: "project_editing", label: "Editar Projeto" },
    { value: "task_breakdown", label: "Quebrar Tarefas" },
    { value: "priority_analysis", label: "Análise de Prioridade" },
    { value: "template_generation", label: "Gerar Template" },
    { value: "block_creation", label: "Criar Blocos" },
    { value: "block_editing", label: "Editar Blocos" },
    { value: "research_assistant", label: "Pesquisa" },
    { value: "link_summarization", label: "Resumir Link" },
    { value: "trend_analysis", label: "Análise de Tendências" },
    { value: "competitive_research", label: "Pesquisa Competitiva" },
    { value: "fact_checking", label: "Verificar Fatos" },
    { value: "source_gathering", label: "Coletar Fontes" },
  ];

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

  // Health check effect
  useEffect(() => {
    const fetchHealth = async () => {
      const status = await checkHealth();
      setHealthStatus(status);
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ------------------------------ Handlers ------------------------------ */

  const handleSend = async () => {
    if (!input.trim() || !selectedModel || isTyping) return;
    const value = input;
    setInput("");

    // Preparar contexto com notas e projetos
    const context: Record<string, unknown> = {};
    if (contextItems.length > 0) {
      const notes = contextItems.filter((item) => item.type === "note").map((item) => item.id);
      const projects = contextItems
        .filter((item) => item.type === "project")
        .map((item) => item.id);

      if (notes.length > 0) context.noteIds = notes;
      if (projects.length > 0) context.projectIds = projects;
    }

    await sendMessage({
      message: value,
      model: selectedModel.id,
      sessionId: currentSession?.id,
      allowEdit,
      useCase: selectedUseCase || undefined,
      context,
    });
  };

  const handleAddContext = (type: "note" | "project", id: string, title: string) => {
    const exists = contextItems.some((item) => item.type === type && item.id === id);
    if (!exists) {
      setContextItems([...contextItems, { type, id, title }]);
    }
    setShowContextMenu(false);
  };

  const handleRemoveContext = (type: "note" | "project", id: string) => {
    setContextItems(contextItems.filter((item) => !(item.type === type && item.id === id)));
  };

  /* -------------------------------- Layout -------------------------------- */

  return (
    <div className="flex h-full w-full flex-col space-y-3">
      {/* ============================ TOP BAR ============================ */}
      <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-2">
          <span className="sm:text-md text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
            <span className="text-yellow-500">Weave AI</span>
            {selectedModel && (
              <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">
                • {selectedModel.name}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-neutral-600 sm:gap-4 sm:text-sm dark:text-neutral-400">
          <span className="truncate text-xs">
            {new Date().toLocaleString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <div
            title={
              healthStatus
                ? healthStatus.status === "offline"
                  ? "API Offline"
                  : `${healthStatus.responseTime}ms`
                : "Verificando..."
            }
            className="flex items-center"
          >
            <div
              className={`h-2 w-2 rounded-full transition-colors ${
                !healthStatus
                  ? "animate-pulse bg-neutral-400"
                  : healthStatus.status === "offline"
                    ? "bg-red-500"
                    : healthStatus.responseTime < 200
                      ? "bg-emerald-500"
                      : healthStatus.responseTime < 500
                        ? "bg-amber-500"
                        : "bg-red-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* ============================ MAIN CHAT CONTAINER ============================ */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100">
        {/* ============================ DRAWER (DIV LATERAL) ============================ */}
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
            isDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setIsDrawerOpen(false)}
        />

        {/* Painel Lateral (Substituído aside por div) */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-[300px] transform border-r border-neutral-200 bg-neutral-50 shadow-2xl transition-transform duration-300 ease-in-out dark:border-neutral-800 dark:bg-neutral-900 ${
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">
              Histórico
            </span>
            <button
              title="close"
              onClick={() => setIsDrawerOpen(false)}
              className="rounded-md p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              <X className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            </button>
          </div>

          <div className="flex h-[calc(100%-64px)] flex-col px-3 pb-4">
            <button
              onClick={() => {
                createNewSession();
                setIsDrawerOpen(false);
              }}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <Plus className="h-4 w-4" />
              Nova Conversa
            </button>

            <div className="scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800 flex-1 space-y-1 overflow-y-auto">
              {chatHistory?.length ? (
                chatHistory.map((chat) => (
                  <HistoryItem
                    key={chat.id}
                    title={chat.title || "Nova conversa"}
                    active={currentSession?.id === chat.id}
                    onClick={() => {
                      loadSession?.(chat.id);
                      setIsDrawerOpen(false);
                    }}
                  />
                ))
              ) : (
                <div className="mt-10 flex flex-col items-center justify-center gap-2 text-center opacity-50">
                  <MessageSquare className="h-8 w-8 text-neutral-400" />
                  <p className="text-xs">Nenhuma conversa ainda</p>
                </div>
              )}
            </div>

            {/* Rodapé do menu */}
            <div className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <div className="flex items-center gap-3 px-2">
                <div className="h-8 w-8 overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800">
                  {user?.avatar_url && (
                    <Image src={user.avatar_url} width={32} height={32} alt="Avatar" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{user?.email || "Usuário"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================ HEADER ============================ */}
        <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-2">
            <button
              className="rounded-md p-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => setIsDrawerOpen(true)}
              title="Histórico"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800" />

            <h1 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {currentSession?.title || "Nova Conversa"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Model */}
            <div className="relative">
              <button
                onClick={() => setIsModelMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
              >
                <ModelIcon provider={selectedModel?.provider} />
                <span className="font-medium">{selectedModel?.name || "Modelo"}</span>
                <ChevronDown className="h-3 w-3 text-neutral-500" />
              </button>

              {isModelMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)} />
                  <div className="absolute top-full left-0 z-20 mt-1 w-52 rounded border border-neutral-200 bg-neutral-50 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model);
                          setIsModelMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                          selectedModel?.id === model.id ? "bg-neutral-50 dark:bg-neutral-800" : ""
                        }`}
                      >
                        <ModelIcon provider={model.provider} />
                        {model.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ============================ CHAT AREA (Substituído main por div) ============================ */}
        <div className="h-[calc(100vh-16rem)] flex-shrink-0 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 md:py-10">
            {messages.length === 0 && !loading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 mt-20 flex flex-col items-center text-center duration-500">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-900">
                  <Sparkles className="h-8 w-8 text-neutral-400" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">Como posso ajudar hoje?</h2>
                <p className="mt-2 max-w-sm text-neutral-500">
                  Selecione um modelo e comece sua jornada.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((msg) => {
                //const model = models.find((m) => m.id === msg.model);
                const isUser = msg.role === "user";

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    <div className="mt-1 flex-shrink-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-md shadow-sm ring-1 ring-black/5 ${
                          isUser
                            ? "bg-gradient-to-br from-blue-600 to-indigo-600"
                            : "bg-gradient-to-br from-emerald-500 to-teal-600"
                        }`}
                      >
                        {isUser ? (
                          user?.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt="User"
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-white" />
                          )
                        ) : (
                          <Bot className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`relative rounded-md px-4 py-2.5 pb-1.5 text-sm leading-relaxed before:absolute before:top-2 ${isUser ? "rounded-tr-sm before:left-full before:border-8 before:border-transparent before:border-l-neutral-900 dark:before:border-l-white" : "rounded-tl-sm before:right-full before:border-8 before:border-transparent before:border-r-white dark:before:border-r-neutral-900"} ${
                          isUser
                            ? "bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900"
                            : "border border-neutral-200 bg-neutral-50 text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-neutral prose-sm dark:prose-invert prose-pre:bg-neutral-950 prose-pre:rounded-md prose-pre:p-4 max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                code: ({ node, inline, className, children, ...props }: any) => {
                                  if (inline) {
                                    return (
                                      <code
                                        className="rounded-md bg-neutral-200/50 px-1.5 py-0.5 font-mono text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
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
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}

                        {/* Timestamp e ações dentro do balão */}
                        <div
                          className={`mt-2 flex items-center gap-2 border-t pt-1.5 ${isUser ? "justify-end border-neutral-800/20 dark:border-neutral-200/20" : "justify-between border-neutral-200 dark:border-neutral-700"}`}
                        >
                          <span
                            className={`text-[10px] ${isUser ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-400 dark:text-neutral-500"}`}
                          >
                            {new Date(msg.created_at || msg.timestamp).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <button
                            onClick={() => navigator.clipboard.writeText(msg.content)}
                            className={`flex items-center gap-1 text-[10px] font-medium tracking-wider uppercase transition ${isUser ? "text-neutral-400 hover:text-neutral-300 dark:text-neutral-500 dark:hover:text-neutral-400" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"}`}
                            title="Copiar mensagem"
                          >
                            <Copy className="h-3 w-3" /> Copiar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="relative flex items-center rounded-md rounded-tl-sm border border-neutral-200 bg-neutral-50 px-5 py-4 shadow-sm before:absolute before:top-2 before:right-full before:border-8 before:border-transparent before:border-r-white dark:border-neutral-800 dark:bg-neutral-900 dark:before:border-r-neutral-900">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 animate-bounce rounded-md bg-neutral-400 [animation-delay:-0.3s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-md bg-neutral-400 [animation-delay:-0.15s]"></span>
                      <span className="h-2 w-2 animate-bounce rounded-md bg-neutral-400"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>
        </div>

        {/* ============================ INPUT AREA ============================ */}
        <div className="border-t border-neutral-200 bg-neutral-50 p-3 sm:p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto max-w-5xl">
            {/* Controles de Ações e Contexto */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {/* Use Case */}
              <div className="min-w-[160px] flex-1 sm:flex-initial">
                <select
                  id="usecase-select"
                  title="Caso de uso"
                  value={selectedUseCase}
                  onChange={(e) => setSelectedUseCase(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800 dark:focus:ring-neutral-700"
                >
                  {useCases.map((uc) => (
                    <option key={uc.value} value={uc.value}>
                      {uc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Allow Edit */}
              <button
                title={allowEdit ? "Desativar ações" : "Ativar ações"}
                onClick={() => setAllowEdit(!allowEdit)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 ${
                  allowEdit
                    ? "border-green-300 bg-gradient-to-r from-green-50 to-green-100 text-green-700 hover:from-green-100 hover:to-green-200 dark:border-green-800 dark:from-green-900/30 dark:to-green-900/20 dark:text-green-400 dark:hover:from-green-900/40 dark:hover:to-green-900/30"
                    : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                }`}
              >
                {allowEdit ? (
                  <Unlock className="h-3.5 w-3.5 animate-pulse" />
                ) : (
                  <Lock className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Permitir ações</span>
              </button>
            </div>

            {/* Context Items */}
            {contextItems.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {contextItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="group flex items-center gap-2 rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-1.5 text-sm shadow-sm transition-all hover:shadow-md dark:border-blue-800 dark:from-blue-900/30 dark:to-blue-900/20"
                  >
                    {item.type === "note" ? (
                      <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <FolderKanban className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                    <span className="font-medium text-blue-700 dark:text-blue-300">
                      {item.title}
                    </span>
                    <button
                      title="Remover do contexto"
                      onClick={() => handleRemoveContext(item.type, item.id)}
                      className="rounded-md p-0.5 opacity-60 transition-all group-hover:opacity-100 hover:bg-blue-200 hover:opacity-100 dark:hover:bg-blue-800"
                    >
                      <X className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-2">
              {/* Context Menu Button */}
              <div className="relative">
                <button
                  title="Adicionar contexto"
                  onClick={() => setShowContextMenu(!showContextMenu)}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-neutral-50 shadow-sm transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-95 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800"
                >
                  <Paperclip className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                </button>

                {/* Context Menu Dropdown */}
                {showContextMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowContextMenu(false)} />
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded border border-neutral-200 bg-neutral-50 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="max-h-64 overflow-y-auto">
                        {/* Notas */}
                        <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
                          <div className="mb-2 px-2 text-xs font-semibold text-neutral-500">
                            Notas
                          </div>
                          {notesOverview && notesOverview.length > 0 ? (
                            notesOverview.slice(0, 10).map((note) => (
                              <button
                                key={note.id}
                                onClick={() => handleAddContext("note", note.id, note.title)}
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                              >
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="truncate">{note.title}</span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-xs text-neutral-500">Nenhuma nota</p>
                          )}
                        </div>

                        {/* Projetos */}
                        <div className="p-2">
                          <div className="mb-2 px-2 text-xs font-semibold text-neutral-500">
                            Projetos
                          </div>
                          {projectsOverview && projectsOverview.length > 0 ? (
                            projectsOverview.slice(0, 10).map((project) => (
                              <button
                                key={project.id}
                                onClick={() =>
                                  handleAddContext("project", project.id, project.title)
                                }
                                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                              >
                                <FolderKanban className="h-4 w-4 text-purple-500" />
                                <span className="truncate">{project.title}</span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-xs text-neutral-500">Nenhum projeto</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Digite sua mensagem..."
                className="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm shadow-sm transition-all focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:focus:ring-neutral-700"
              />
              <button
                title="Enviar"
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-md transition-all hover:scale-105 hover:from-black hover:to-neutral-900 hover:shadow-lg active:scale-95 disabled:opacity-30 disabled:hover:scale-100 dark:from-white dark:to-neutral-100 dark:text-neutral-900 dark:hover:from-neutral-100 dark:hover:to-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
