"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  MessageSquare,
  X,
  Copy,
  Sparkles,
  ChevronDown,
  Globe,
  Lock,
  Unlock,
  Paperclip,
  NotebookPen,
  FileText,
  FolderKanban,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { useChat } from "@/app/_contexts/chat-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { type AIModel } from "@/app/_contexts/chat-context";
import { useAgent } from "@/app/_contexts/agent-context";
import "highlight.js/styles/github-dark.css";
import Image from "next/image";
import { useRouter } from "next/navigation";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "csv", "xls"];

const ModelIcon = ({ model, className }: { model?: AIModel | null; className?: string }) => {
  if (model?.logoUrl) {
    return (
      <img
        src={model.logoUrl}
        alt={`${model.provider || model.name || "model"} logo`}
        className={className || "h-3 w-3 rounded-sm object-contain"}
      />
    );
  }

  if (model?.provider === "perplexity") return <Globe className="h-3 w-3 text-brand-navy" />;
  return <Sparkles className="h-3 w-3 text-brand-yellow" />;
};

function formatModelLabel(model: AIModel) {
  const providerLabel = model.name ? model.name.toUpperCase() : "MODEL";
  return model.description
    ? `${providerLabel} - ${model.description} (${model.version})`
    : `${providerLabel} (${model.version})`;
}

function validateChatFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return `Arquivo "${file.name}" inválido. Formatos aceitos: PNG, JPG, PDF, CSV e XLS.`;
  }

  const maxSize = ["png", "jpg", "jpeg"].includes(extension) ? IMAGE_MAX_BYTES : DOCUMENT_MAX_BYTES;
  if (file.size > maxSize) {
    const maxSizeMb = maxSize / (1024 * 1024);
    return `Arquivo "${file.name}" excede o limite de ${maxSizeMb}MB.`;
  }

  return null;
}

export default function ChatInterface({ chatId }: { chatId?: string } = {}) {
  const router = useRouter();
  const {
    models,
    messages,
    loading,
    isTyping,
    currentSession,
    loadModels,
    loadSession,
    sendMessage,
    createNewSession,
  } = useChat();
  const { user } = useAuth();
  const { notesOverview } = useNotes();
  const { projectsOverview } = useProjects();
  const { agents, loadAgents } = useAgent();

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [allowEdit, setAllowEdit] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [contextItems, setContextItems] = useState<{ type: string; id: string; title: string }[]>(
    []
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0]);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (chatId) {
      // Prevent overwriting freshly rendered messages right after first-send route replace.
      if (currentSession?.id === chatId && messages.length > 0) {
        return;
      }
      loadSession(chatId);
      return;
    }

    createNewSession();
  }, [chatId, loadSession, createNewSession, currentSession?.id, messages.length]);

  useEffect(() => {
    if (!chatId && currentSession?.id) {
      router.replace(`/weave-ai/chat/${currentSession.id}`);
    }
  }, [chatId, currentSession?.id, router]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const noteIds = contextItems
      .filter((item) => item.type === "note")
      .map((item) => item.id);
    const projectIds = contextItems
      .filter((item) => item.type === "project")
      .map((item) => item.id);

    const message = input.trim();
    setInput("");

    await sendMessage({
      message,
      model: {
        name: selectedModel?.provider || selectedModel?.name || "auto",
        version: selectedModel?.version,
      },
      sessionId: currentSession?.id || chatId,
      allowEdit,
      agentId: selectedAgentId || undefined,
      context: {
        selectedContextItems: contextItems.map((item) => ({
          type: item.type,
          id: item.id,
          title: item.title,
        })),
      },
      noteIds,
      projectIds,
      files: selectedFiles.length > 0 ? selectedFiles : undefined,
    });

    setSelectedFiles([]);
    setFileError(null);
  };

  const handleAddContext = (type: string, id: string, title: string) => {
    if (!contextItems.find((item) => item.id === id)) {
      setContextItems((prev) => [...prev, { type, id, title }]);
    }
    setShowContextMenu(false);
  };

  const handleRemoveContext = (type: string, id: string) => {
    setContextItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;

    const incomingFiles = Array.from(filesList);
    for (const file of incomingFiles) {
      const validationError = validateChatFile(file);
      if (validationError) {
        setFileError(validationError);
        return;
      }
    }

    setFileError(null);
    setSelectedFiles((prev) => {
      const nextFiles = [...prev];
      incomingFiles.forEach((file) => {
        const alreadyExists = nextFiles.some(
          (existing) => existing.name === file.name && existing.size === file.size
        );
        if (!alreadyExists) {
          nextFiles.push(file);
        }
      });
      return nextFiles;
    });
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || null;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-neutral-950">
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-neutral-200 px-2 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {currentSession?.title || "Nova Conversa"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAllowEdit(!allowEdit)}
            className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-all ${
              allowEdit
                ? "bg-brand-yellow text-brand-navy"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800"
            }`}
          >
            {allowEdit ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            <span>Permitir editar</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex-shrink-0 overflow-y-auto scroll-smooth p-2">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {messages?.length === 0 && !loading && (
            <div className="animate-in fade-in mt-12 flex flex-col items-center text-center duration-500">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-brand-beige dark:bg-brand-navy/30">
                <Sparkles className="h-5 w-5 text-brand-orange" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight">Como posso ajudar?</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Selecione contexto, arquivos opcionais e inicie a conversa.
              </p>
            </div>
          )}

          {messages?.map((msg: any) => {
            const isUser = msg.role === "user";

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div
                    className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded shadow-sm ${
                      isUser ? "bg-brand-yellow" : "bg-brand-navy"
                    }`}
                  >
                    {isUser ? (
                      user?.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt="User"
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-3 w-3 text-brand-navy" />
                      )
                    ) : (
                      <Bot className="h-3 w-3 text-white" />
                    )}
                  </div>
                </div>

                <div
                  className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative rounded border p-2 text-xs leading-relaxed ${
                      isUser
                        ? "border-brand-yellow bg-brand-yellow text-brand-navy"
                        : "border-neutral-200 bg-white text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose prose-neutral prose-sm dark:prose-invert prose-pre:p-2 prose-pre:rounded max-w-none text-xs">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}

                    {!isUser && Array.isArray(msg.functionExecution) && msg.functionExecution.length > 0 && (
                      <div className="mt-2 rounded border border-brand-orange/50 bg-brand-beige p-1.5 text-[10px] text-brand-navy dark:border-brand-orange/40 dark:bg-brand-navy/20 dark:text-brand-beige">
                        <p className="mb-1 font-semibold uppercase tracking-wide">Acoes executadas</p>
                        {msg.functionExecution.map((execution: any, index: number) => (
                          <p key={`${execution.name}-${index}`}>
                            {execution.name} - {execution.success ? "ok" : "erro"}
                          </p>
                        ))}
                      </div>
                    )}

                    <div
                      className={`mt-1.5 flex items-center gap-2 pt-1 opacity-70 ${isUser ? "justify-end" : "justify-between"}`}
                    >
                      <span className="text-[9px]">
                        {new Date(msg.created_at || msg.timestamp || Date.now()).toLocaleTimeString(
                          "pt-PT",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.content)}
                        className="flex items-center gap-1 text-[9px] uppercase hover:opacity-100"
                      >
                        <Copy className="h-2.5 w-2.5" /> Copiar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-brand-navy">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <div className="flex items-center rounded border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-yellow [animation-delay:-0.3s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-yellow [animation-delay:-0.15s]"></span>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-yellow"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50/50 p-2 dark:border-neutral-800 dark:bg-neutral-950/50">
        <div className="mx-auto flex max-w-4xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {selectedFiles.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="flex items-center gap-1 rounded border border-brand-orange/50 bg-brand-orange/15 px-1.5 py-0.5 text-[10px] text-brand-orange dark:border-brand-orange/40 dark:bg-brand-orange/20 dark:text-brand-yellow"
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(file)}
                    title="Remover arquivo"
                    aria-label="Remover arquivo"
                    className="hover:text-brand-red dark:hover:text-brand-red"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}

              {contextItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center gap-1 rounded border border-brand-navy/30 bg-brand-beige px-1.5 py-0.5 text-[10px] text-brand-navy dark:border-brand-beige/20 dark:bg-brand-navy/30 dark:text-brand-beige"
                >
                  {item.type === "note" ? (
                    <FileText className="h-2.5 w-2.5" />
                  ) : (
                    <FolderKanban className="h-2.5 w-2.5" />
                  )}
                  <span className="font-medium">{item.title}</span>
                  <button
                    onClick={() => handleRemoveContext(item.type, item.id)}
                    title="Remover contexto"
                    aria-label="Remover contexto"
                    className="hover:text-brand-red dark:hover:text-brand-red"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex flex-col gap-1 rounded-xl border border-neutral-300 bg-white p-2 shadow-sm transition-all focus-within:border-brand-yellow focus-within:ring-1 focus-within:ring-brand-yellow/40 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-brand-yellow dark:focus-within:ring-brand-yellow/30">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf,.csv,.xls"
              className="hidden"
              onChange={(event) => {
                handleFilesSelected(event.target.files);
                event.currentTarget.value = "";
              }}
            />

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
              placeholder="Envie uma mensagem..."
              className="max-h-32 min-h-[40px] w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Anexar arquivos"
                  aria-label="Anexar arquivos"
                  className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowContextMenu(!showContextMenu)}
                    title="Indexar contexto"
                    aria-label="Indexar contexto"
                    className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige"
                  >
                    <NotebookPen className="h-4 w-4" />
                  </button>

                  {showContextMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowContextMenu(false)} />
                      <div className="absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="max-h-48 overflow-y-auto p-1">
                          <div className="px-1.5 py-1 text-[9px] font-bold text-neutral-400 uppercase">
                            Tarefas
                          </div>
                          {notesOverview?.slice(0, 5).map((note: any) => (
                            <button
                              key={note.id}
                              onClick={() => handleAddContext("note", note.id, note.title)}
                              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-brand-beige dark:hover:bg-brand-navy/30"
                            >
                              <FileText className="h-3 w-3 text-brand-orange" />
                              <span className="truncate">{note.title}</span>
                            </button>
                          ))}

                          <div className="mt-1 border-t border-neutral-100 px-1.5 py-1 text-[9px] font-bold text-neutral-400 uppercase dark:border-neutral-800">
                            Projetos
                          </div>
                          {projectsOverview?.slice(0, 5).map((project: any) => (
                            <button
                              key={project.id}
                              onClick={() => handleAddContext("project", project.id, project.title)}
                              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-brand-beige dark:hover:bg-brand-navy/30"
                            >
                              <FolderKanban className="h-3 w-3 text-brand-navy dark:text-brand-yellow" />
                              <span className="truncate">{project.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative ml-1">
                  <button
                    onClick={() => setIsModelMenuOpen((v) => !v)}
                    className="flex h-8 items-center gap-1.5 rounded-md border border-brand-beige bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-brand-beige hover:text-brand-navy dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige"
                  >
                    <ModelIcon model={selectedModel} className="h-3.5 w-3.5" />
                    <span>{selectedModel ? formatModelLabel(selectedModel) : "Modelo"}</span>
                    <ChevronDown className="h-3 w-3 text-neutral-500" />
                  </button>

                  {isModelMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsModelMenuOpen(false)} />
                      <div className="absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                        <div className="max-h-48 overflow-y-auto p-1">
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model);
                                setIsModelMenuOpen(false);
                              }}
                              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-brand-beige dark:hover:bg-brand-navy/30 ${
                                selectedModel?.id === model.id
                                  ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                  : ""
                              }`}
                            >
                              <ModelIcon model={model} className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{formatModelLabel(model)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative ml-1">
                  <button
                    onClick={() => setIsAgentMenuOpen((prev) => !prev)}
                    className="flex h-8 items-center gap-1.5 rounded-md border border-brand-beige bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-brand-beige hover:text-brand-navy dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>{selectedAgent ? selectedAgent.name : "Agente padrão"}</span>
                    <ChevronDown className="h-3 w-3 text-neutral-500" />
                  </button>

                  {isAgentMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsAgentMenuOpen(false)} />
                      <div className="absolute right-0 bottom-full z-20 mb-2 w-56 rounded border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                        <button
                          onClick={() => {
                            setSelectedAgentId(null);
                            setIsAgentMenuOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 rounded p-2 text-xs hover:bg-brand-beige dark:hover:bg-brand-navy/30 ${
                            !selectedAgentId
                              ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                              : ""
                          }`}
                        >
                          <Bot className="h-3 w-3" />
                          Agente padrão
                        </button>
                        {agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => {
                              setSelectedAgentId(agent.id);
                              setIsAgentMenuOpen(false);
                            }}
                            className={`flex w-full items-center gap-2 rounded p-2 text-left text-xs hover:bg-brand-beige dark:hover:bg-brand-navy/30 ${
                              selectedAgentId === agent.id
                                ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                : ""
                            }`}
                          >
                            <Bot className="h-3 w-3" />
                            <span className="truncate">{agent.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={!input.trim()}
                title="Enviar mensagem"
                aria-label="Enviar mensagem"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-brand-yellow text-brand-navy transition-colors hover:bg-brand-orange disabled:opacity-30 dark:bg-brand-yellow dark:text-brand-navy dark:hover:bg-brand-orange"
              >
                <Send className="ml-0.5 h-4 w-4" />
              </button>
            </div>
          </div>

          {fileError ? <p className="text-[11px] text-brand-red">{fileError}</p> : null}
        </div>
      </div>
    </div>
  );
}