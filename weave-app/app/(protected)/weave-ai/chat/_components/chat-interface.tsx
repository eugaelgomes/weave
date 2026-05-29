"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Bot,
  User,
  MessageSquare,
  X,
  Copy,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Globe,
  Lock,
  Unlock,
  Paperclip,
  NotebookPen,
  FileText,
  FolderKanban,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { useChat } from "@/app/_contexts/chat-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { type AIModel } from "@/app/_contexts/chat-context";
import { useAgent } from "@/app/_contexts/agent-context";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";
import "highlight.js/styles/github-dark.css";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { isChatSessionId } from "@/app/_utils/chat-session-id";

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

  if (model?.provider === "perplexity") return <Globe className="text-brand-navy h-3 w-3" />;
  return <Sparkles className="text-brand-yellow h-3 w-3" />;
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

function getChatHeaderTitle(messages: any[], fallbackTitle?: string | null): string {
  const firstUserMessage = messages.find(
    (msg) => msg?.role === "user" && typeof msg?.content === "string"
  );
  const sourceText = firstUserMessage?.content?.trim() || fallbackTitle?.trim() || "";

  if (!sourceText) {
    return "Nova Conversa";
  }

  const firstLine =
    sourceText
      .split("\n")
      .find((line: string) => line.trim().length > 0)
      ?.trim() || sourceText;
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
}

function formatMessageDateTime(dateValue?: string | number): string {
  return new Date(dateValue || Date.now()).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ChatInterfaceVariant = "fullPage" | "widget";

export default function ChatInterface({
  chatId,
  variant = "fullPage",
}: {
  chatId?: string;
  variant?: ChatInterfaceVariant;
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const {
    models,
    messages,
    loading,
    error,
    isTyping,
    currentSession,
    loadModels,
    loadSession,
    retryMessage,
    sendMessage,
    createNewSession,
  } = useChat();
  const { user } = useAuth();
  const { notesOverview } = useNotes();
  const { projectsOverview } = useProjects();
  const { agents, loadAgents } = useAgent();
  const { canSendAiMessage, gates } = usePlanUsage();

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [allowEdit, setAllowEdit] = useState(true);
  const [allowWebSearch, setAllowWebSearch] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextSearch, setContextSearch] = useState("");
  const [noteContextLimit, setNoteContextLimit] = useState(10);
  const [projectContextLimit, setProjectContextLimit] = useState(10);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [contextItems, setContextItems] = useState<{ type: string; id: string; title: string }[]>(
    []
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const didInitializeNewSessionRef = useRef(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const [showScrollBottomButton, setShowScrollBottomButton] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<
    Record<string, { rating: "like" | "dislike" | null; comment: string; showComment: boolean }>
  >({});

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
    if (variant !== "fullPage") return;
    if (chatId) {
      didInitializeNewSessionRef.current = false;
      return;
    }
    if (didInitializeNewSessionRef.current) return;

    didInitializeNewSessionRef.current = true;
    createNewSession();
  }, [chatId, createNewSession, variant]);

  useEffect(() => {
    if (chatId && !isChatSessionId(chatId)) {
      router.replace("/weave-ai/chat");
      return;
    }
    if (chatId) {
      // Prevent overwriting freshly rendered messages right after first-send route replace.
      if (currentSession?.id === chatId && messages.length > 0) {
        return;
      }
      loadSession(chatId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid re-running on messages.length; optimistic sends would restart loadSession and bump chatStateEpoch, invalidating sendMessage.
  }, [chatId, loadSession, currentSession?.id, router]);

  useEffect(() => {
    if (chatId) return;
    if (!currentSession?.id || !isChatSessionId(currentSession.id)) return;
    if (pathname !== "/weave-ai/chat") return;
    if (messages.length === 0) return;
    router.replace(`/weave-ai/chat/${currentSession.id}`);
  }, [chatId, currentSession?.id, messages.length, pathname, router]);

  const handleSend = async () => {
    if (!input.trim() || isTyping || !canSendAiMessage) return;

    const noteIds = contextItems.filter((item) => item.type === "note").map((item) => item.id);
    const projectIds = contextItems
      .filter((item) => item.type === "project")
      .map((item) => item.id);

    const message = input.trim();
    setInput("");

    const rawSessionId = currentSession?.id || chatId;
    const sessionId = isChatSessionId(rawSessionId) ? rawSessionId : undefined;

    await sendMessage({
      message,
      model: {
        name: selectedModel?.provider || selectedModel?.name || "auto",
        version: selectedModel?.version,
      },
      sessionId,
      allowEdit,
      allowWebSearch,
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

  const updateScrollButtons = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 80;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

    setShowScrollTopButton(scrollTop > threshold);
    setShowScrollBottomButton(distanceToBottom > threshold);
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  };

  const normalizeMessageContent = (content: unknown): string => {
    if (typeof content === "string") return content;
    if (content == null) return "";
    try {
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };

  const handleCopyMessage = async (messageId: string, content: unknown) => {
    const textToCopy = normalizeMessageContent(content);
    if (!textToCopy) return;

    try {
      if (window.isSecureContext && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, textArea.value.length);
        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error("Falha ao copiar com fallback");
        }
      }

      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        setCopiedMessageId((prev) => (prev === messageId ? null : prev));
      }, 1200);
    } catch {
      setCopiedMessageId(null);
    }
  };

  useEffect(() => {
    updateScrollButtons();
  }, [messages, isTyping]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || null;
  const chatHeaderTitle = getChatHeaderTitle(messages || [], currentSession?.title);
  const normalizedContextSearch = contextSearch.trim().toLowerCase();
  const filteredNotes = useMemo(() => {
    const source = Array.isArray(notesOverview) ? notesOverview : [];
    if (!normalizedContextSearch) {
      return source;
    }
    return source.filter((note: any) =>
      String(note?.title || "")
        .toLowerCase()
        .includes(normalizedContextSearch)
    );
  }, [normalizedContextSearch, notesOverview]);
  const filteredProjects = useMemo(() => {
    const source = Array.isArray(projectsOverview) ? projectsOverview : [];
    if (!normalizedContextSearch) {
      return source;
    }
    return source.filter((project: any) =>
      String(project?.title || "")
        .toLowerCase()
        .includes(normalizedContextSearch)
    );
  }, [normalizedContextSearch, projectsOverview]);

  useEffect(() => {
    setNoteContextLimit(10);
    setProjectContextLimit(10);
  }, [normalizedContextSearch]);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#1d1d1b]">
      <div className="dark:border-surface-dark-border flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-2 py-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            {chatHeaderTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAllowWebSearch(!allowWebSearch)}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] transition-all ${
              allowWebSearch
                ? "bg-brand-yellow text-brand-navy"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-[#1d1d1b] dark:hover:bg-neutral-800"
            }`}
          >
            <Globe className="h-2 w-2" />
            <span>{t.weaveAi.webSearch}</span>
          </button>
          <button
            onClick={() => setAllowEdit(!allowEdit)}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] transition-all ${
              allowEdit
                ? "bg-brand-yellow text-brand-navy"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-[#1d1d1b] dark:hover:bg-neutral-800"
            }`}
          >
            {allowEdit ? <Unlock className="h-2 w-2" /> : <Lock className="h-2 w-2" />}
            <span>{t.weaveAi.allowEdit}</span>
          </button>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={updateScrollButtons}
        className="relative flex-1 flex-shrink-0 overflow-y-auto scroll-smooth p-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-400 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {messages?.length === 0 && !loading && (
            <div className="animate-in fade-in mx-auto mt-24 flex max-w-xl flex-col items-center text-center duration-500">
              <div className="mb-6 h-px w-12 bg-neutral-200 dark:bg-neutral-800" />
              <h2 className="text-lg font-medium tracking-tight text-neutral-400 dark:text-neutral-500">
                {t.weaveAi.welcomeTitle}
              </h2>

              <div className="mt-10 flex max-w-md flex-wrap justify-center gap-2">
                {[t.weaveAi.suggestionTask, t.weaveAi.suggestionProject].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[10px] font-medium text-neutral-600 transition-all hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages?.map((msg: any) => {
            const isUser = msg.role === "user";
            const messageStatus = msg?.metadata?.status;
            const isFailedUserMessage = isUser && messageStatus === "failed";
            const citations = Array.isArray(msg?.citations)
              ? msg.citations
              : Array.isArray(msg?.metadata?.citations)
                ? msg.metadata.citations
                : [];

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex max-w-[85%] flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative rounded-2xl p-2 text-xs leading-relaxed ${
                      isUser
                        ? "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                        : "bg-transparent text-neutral-800 dark:text-neutral-200"
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

                    {!isUser &&
                      Array.isArray(msg.functionExecution) &&
                      msg.functionExecution.length > 0 && (
                        <div className="border-brand-orange/50 bg-brand-beige text-brand-navy dark:border-brand-orange/40 dark:bg-brand-navy/20 dark:text-brand-beige mt-2 rounded border p-1.5 text-[10px]">
                          <p className="mb-1 font-semibold tracking-wide">
                            {t.weaveAi.actionsExecuted}
                          </p>
                          {msg.functionExecution.map((execution: any, index: number) => (
                            <p key={`${execution.name}-${index}`}>
                              {execution.name} - {execution.success ? "ok" : "erro"}
                            </p>
                          ))}
                        </div>
                      )}

                    {!isUser && citations.length > 0 && (
                      <div className="border-brand-navy/30 bg-brand-beige text-brand-navy dark:border-brand-beige/20 dark:bg-brand-navy/30 dark:text-brand-beige mt-2 rounded border p-1.5 text-[10px]">
                        <p className="mb-1 font-semibold tracking-wide">{t.weaveAi.citations}</p>
                        <ul className="space-y-1">
                          {citations.map((citation: any, index: number) => {
                            const title = String(
                              citation?.title ||
                                citation?.name ||
                                citation?.label ||
                                `${t.weaveAi.source} ${index + 1}`
                            );
                            const href = citation?.url ? String(citation.url) : "";
                            return (
                              <li key={`citation-${msg.id}-${index}`}>
                                {href ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline-offset-2 hover:underline"
                                  >
                                    {title}
                                  </a>
                                ) : (
                                  <span>{title}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {isFailedUserMessage && (
                      <div className="border-brand-red/40 text-brand-red mt-2 rounded border bg-red-50 p-1.5 text-[10px] dark:bg-red-950/30">
                        <p>{String(msg?.metadata?.errorMessage || t.weaveAi.errorSend)}</p>
                        <button
                          type="button"
                          onClick={() => retryMessage(String(msg.id))}
                          className="border-brand-red/40 hover:bg-brand-red/10 mt-1 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          {t.common.retry}
                        </button>
                      </div>
                    )}

                    <div
                      className={`mt-1.5 flex flex-col gap-1.5 pt-1 ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`flex items-center gap-3 opacity-40 transition-opacity hover:opacity-100 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <span className="text-[9px]">
                          {formatMessageDateTime(msg.created_at || msg.timestamp)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            title={t.weaveAi.copyMessage}
                            className="flex items-center hover:text-neutral-900 dark:hover:text-neutral-100"
                          >
                            <Copy className="h-2.5 w-2.5" />
                            {copiedMessageId === msg.id && (
                              <span className="ml-1 text-[8px]">{t.weaveAi.copied}</span>
                            )}
                          </button>

                          {!isUser && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const current = feedbackState[msg.id];
                                  setFeedbackState({
                                    ...feedbackState,
                                    [msg.id]: {
                                      rating: current?.rating === "like" ? null : "like",
                                      comment: current?.comment || "",
                                      showComment: current?.rating !== "like",
                                    },
                                  });
                                }}
                                className={`flex items-center transition-colors ${feedbackState[msg.id]?.rating === "like" ? "text-green-600 opacity-100" : "hover:text-green-600"}`}
                                title={t.weaveAi.like}
                              >
                                <ThumbsUp className="h-2.5 w-2.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const current = feedbackState[msg.id];
                                  setFeedbackState({
                                    ...feedbackState,
                                    [msg.id]: {
                                      rating: current?.rating === "dislike" ? null : "dislike",
                                      comment: current?.comment || "",
                                      showComment: current?.rating !== "dislike",
                                    },
                                  });
                                }}
                                className={`flex items-center transition-colors ${feedbackState[msg.id]?.rating === "dislike" ? "text-red-600 opacity-100" : "hover:text-red-600"}`}
                                title={t.weaveAi.dislike}
                              >
                                <ThumbsDown className="h-2.5 w-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {!isUser && feedbackState[msg.id]?.showComment && (
                        <div
                          className={`animate-in fade-in slide-in-from-top-1 w-full max-w-[200px] text-left duration-200`}
                        >
                          <input
                            type="text"
                            placeholder={t.weaveAi.feedbackPlaceholder}
                            value={feedbackState[msg.id]?.comment || ""}
                            onChange={(e) =>
                              setFeedbackState({
                                ...feedbackState,
                                [msg.id]: { ...feedbackState[msg.id], comment: e.target.value },
                              })
                            }
                            className="focus:border-brand-yellow w-full border-b border-neutral-200 bg-transparent py-0.5 text-[9px] outline-none placeholder:text-neutral-400 dark:border-neutral-800"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex gap-2">
              <div className="dark:border-surface-dark-border flex items-center rounded border border-neutral-200 bg-white px-3 py-2 dark:bg-[#1d1d1b]">
                <div className="flex gap-1">
                  <span className="bg-brand-yellow h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.3s]"></span>
                  <span className="bg-brand-yellow h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:-0.15s]"></span>
                  <span className="bg-brand-yellow h-1.5 w-1.5 animate-bounce rounded-full"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>

        {(showScrollTopButton || showScrollBottomButton) && (
          <div className="pointer-events-none sticky right-3 z-20 ml-auto flex w-fit flex-col gap-1.5">
            {showScrollTopButton && (
              <button
                onClick={scrollToTop}
                title={t.weaveAi.scrollToTop}
                aria-label={t.weaveAi.scrollToTop}
                className="dark:border-surface-dark-border-strong pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:bg-[#1d1d1b]/95 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            )}
            {showScrollBottomButton && (
              <button
                onClick={scrollToBottom}
                title={t.weaveAi.scrollToBottom}
                aria-label={t.weaveAi.scrollToBottom}
                className="dark:border-surface-dark-border-strong pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:bg-[#1d1d1b]/95 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="pb-2">
        <div className="mx-auto flex max-w-4xl flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {selectedFiles.map((file) => (
                <div
                  key={`${file.name}-${file.size}`}
                  className="border-brand-orange/50 bg-brand-orange/15 text-brand-orange dark:border-brand-orange/40 dark:bg-brand-orange/20 dark:text-brand-yellow flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  <span className="font-medium">{file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(file)}
                    title={t.common.remove}
                    aria-label={t.common.remove}
                    className="hover:text-brand-red dark:hover:text-brand-red"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}

              {contextItems.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="border-brand-navy/30 bg-brand-beige text-brand-navy dark:border-brand-beige/20 dark:bg-brand-navy/30 dark:text-brand-beige flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
                >
                  {item.type === "note" ? (
                    <FileText className="h-2.5 w-2.5" />
                  ) : (
                    <FolderKanban className="h-2.5 w-2.5" />
                  )}
                  <span className="font-medium">{item.title}</span>
                  <button
                    onClick={() => handleRemoveContext(item.type, item.id)}
                    title={t.common.remove}
                    aria-label={t.common.remove}
                    className="hover:text-brand-red dark:hover:text-brand-red"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="focus-within:border-brand-yellow focus-within:ring-brand-yellow/40 dark:border-surface-dark-border-strong dark:focus-within:border-brand-yellow dark:focus-within:ring-brand-yellow/30 relative flex flex-col gap-1 rounded-xl border border-neutral-300 bg-white p-2 shadow-sm transition-all focus-within:ring-1 dark:bg-[#1d1d1b]">
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
              disabled={!canSendAiMessage}
              placeholder={
                canSendAiMessage
                  ? t.weaveAi.inputPlaceholder
                  : (t.weaveAi.limitReached ?? "Monthly AI message limit reached")
              }
              className="max-h-32 min-h-[40px] w-full resize-none bg-transparent px-1 py-1 text-sm outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-100 dark:placeholder:text-neutral-500"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title={t.weaveAi.attachFiles}
                  aria-label={t.weaveAi.attachFiles}
                  className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors"
                >
                  <Paperclip className="h-4 w-4" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowContextMenu(!showContextMenu)}
                    title={t.weaveAi.indexContext}
                    aria-label={t.weaveAi.indexContext}
                    className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors"
                  >
                    <NotebookPen className="h-4 w-4" />
                  </button>

                  {showContextMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowContextMenu(false)}
                      />
                      <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-56 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                        <div className="dark:border-surface-dark-border border-b border-neutral-100 p-1">
                          <input
                            value={contextSearch}
                            onChange={(event) => setContextSearch(event.target.value)}
                            placeholder={t.weaveAi.searchContext}
                            className="focus:border-brand-yellow dark:border-surface-dark-border-strong w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs outline-none dark:bg-[#1d1d1b]"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1">
                          <div className="px-1.5 py-1 text-[9px] font-bold text-neutral-400">
                            {t.weaveAi.tasks}
                          </div>
                          {filteredNotes.slice(0, noteContextLimit).map((note: any) => (
                            <button
                              key={note.id}
                              onClick={() => handleAddContext("note", note.id, note.title)}
                              className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs"
                            >
                              <FileText className="text-brand-orange h-3 w-3" />
                              <span className="truncate">{note.title}</span>
                            </button>
                          ))}
                          {filteredNotes.length > noteContextLimit && (
                            <button
                              type="button"
                              onClick={() => setNoteContextLimit((prev) => prev + 10)}
                              className="text-brand-navy hover:bg-brand-beige dark:text-brand-yellow dark:hover:bg-brand-navy/30 w-full rounded px-2 py-1 text-left text-[10px] font-semibold"
                            >
                              {t.common.showMore}
                            </button>
                          )}

                          <div className="dark:border-surface-dark-border mt-1 border-t border-neutral-100 px-1.5 py-1 text-[9px] font-bold text-neutral-400">
                            {t.weaveAi.projects}
                          </div>
                          {filteredProjects.slice(0, projectContextLimit).map((project: any) => (
                            <button
                              key={project.id}
                              onClick={() => handleAddContext("project", project.id, project.title)}
                              className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs"
                            >
                              <FolderKanban className="text-brand-navy dark:text-brand-yellow h-3 w-3" />
                              <span className="truncate">{project.title}</span>
                            </button>
                          ))}
                          {filteredProjects.length > projectContextLimit && (
                            <button
                              type="button"
                              onClick={() => setProjectContextLimit((prev) => prev + 10)}
                              className="text-brand-navy hover:bg-brand-beige dark:text-brand-yellow dark:hover:bg-brand-navy/30 w-full rounded px-2 py-1 text-left text-[10px] font-semibold"
                            >
                              {t.common.showMore}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative ml-1">
                  <button
                    onClick={() => setIsModelMenuOpen((v) => !v)}
                    className="border-brand-beige hover:bg-brand-beige hover:text-brand-navy dark:border-surface-dark-border dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 items-center gap-1.5 rounded-full border bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors dark:bg-[#1d1d1b] dark:text-neutral-400"
                  >
                    <span className="text-[10px] font-medium text-neutral-500">
                      {t.weaveAi.model}:
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {loading ? t.common.loading : selectedModel?.name}
                    </span>
                    <ChevronDown className="h-3 w-3 text-neutral-500" />
                  </button>

                  {isModelMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsModelMenuOpen(false)}
                      />
                      <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                        <div className="max-h-48 overflow-y-auto p-1">
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model);
                                setIsModelMenuOpen(false);
                              }}
                              className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs ${
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
                    className="border-brand-beige hover:bg-brand-beige hover:text-brand-navy dark:border-surface-dark-border dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 items-center gap-1.5 rounded-full border bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors dark:bg-[#1d1d1b] dark:text-neutral-400"
                  >
                    <span className="text-[10px] font-medium text-neutral-500">
                      {t.weaveAi.agent}:
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {loading ? t.common.loading : selectedAgent?.name || t.nav.agent}
                    </span>
                    <ChevronDown className="h-3 w-3 text-neutral-500" />
                  </button>

                  {isAgentMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsAgentMenuOpen(false)}
                      />
                      <div className="dark:border-surface-dark-border absolute right-0 bottom-full z-20 mb-2 w-56 rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                        <button
                          onClick={() => {
                            setSelectedAgentId(null);
                            setIsAgentMenuOpen(false);
                          }}
                          className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-2 rounded p-2 text-xs ${
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
                            className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-2 rounded p-2 text-left text-xs ${
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
                disabled={!input.trim() || !canSendAiMessage}
                title="Enviar mensagem"
                aria-label="Enviar mensagem"
                className="bg-brand-yellow text-brand-navy hover:bg-brand-orange dark:bg-brand-yellow dark:text-brand-navy dark:hover:bg-brand-orange flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30"
              >
                <Send className="ml-0.5 h-4 w-4" />
              </button>
            </div>
          </div>

          {!canSendAiMessage && (
            <p className="text-brand-red text-[11px]">
              {t.weaveAi.limitReached ?? "Monthly AI message limit reached."}{" "}
              <button
                onClick={() => router.push("/settings/plans")}
                className="hover:text-brand-orange underline"
              >
                {t.weaveAi.viewPlans ?? "View plans"}
              </button>
            </p>
          )}
          {fileError ? <p className="text-brand-red text-[11px]">{fileError}</p> : null}
          {error ? <p className="text-brand-red text-[11px]">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
