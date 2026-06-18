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
  Settings2,
  CheckCircle2,
  XCircle,
  Search,
  Brain,
  FileEdit,
  FilePlus2,
  ChevronRight,
  Loader2,
  Table,
  Download,
  Share2,
  BrainCircuit,
  ChevronDown,
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
import { useAgent, type Agent } from "@/app/_contexts/agent-context";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";
import "highlight.js/styles/github-dark.css";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { isChatSessionId } from "@/app/_utils/chat-session-id";
import { resolveProjectIcon } from "@/app/(protected)/[orgId]/projects/_components/project-icon";
import { routes } from "@/app/_utils/routes";
import getStorageUrl from "@/app/_utils/get-storage-url";
import {
  submitMessageFeedback,
  shareChatSession,
} from "@/app/_services/ai-agent-service/agent-service";
import { toast } from "sonner";

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

const AgentIcon = ({ agent, className }: { agent?: Agent | null; className?: string }) => {
  if (agent?.avatar_url) {
    return (
      <img
        src={agent.avatar_url}
        alt={`${agent.name || "agent"} avatar`}
        className={className || "h-3 w-3 rounded-full object-cover"}
      />
    );
  }
  return <Bot className={className || "h-3 w-3 text-neutral-500"} />;
};

function formatModelLabel(model: AIModel) {
  return model.name || model.description || model.version || "Unknown Model";
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

function RenderContextIcon({
  icon,
  fallback: Fallback,
  color,
}: {
  icon: any;
  fallback: React.ComponentType<any>;
  color?: string | null;
}) {
  const resolved = React.useMemo(() => resolveProjectIcon(icon), [icon]);

  if (resolved?.kind === "emoji") {
    return (
      <span className="shrink-0 text-[11px] leading-none" aria-hidden>
        {resolved.value}
      </span>
    );
  }

  if (resolved?.kind === "image") {
    return (
      <span
        className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-neutral-200/80 dark:border-neutral-700/80"
        aria-hidden
      >
        <img src={resolved.url} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  const accent = color && /^#[0-9A-Fa-f]{3,8}$/i.test(color) ? color : undefined;
  return (
    <Fallback className="h-3.5 w-3.5 shrink-0" style={accent ? { color: accent } : undefined} />
  );
}

export type ChatInterfaceVariant = "fullPage" | "widget";
const ActionExecutionCard = ({ execution, orgId }: { execution: any; orgId: string }) => {
  const { locale } = useLanguage();
  const t =
    locale === "en-US"
      ? { success: "Success", failed: "Failed", details: "Details", open: "Open" }
      : { success: "Sucesso", failed: "Falhou", details: "Detalhes", open: "Abrir" };

  let title = execution.name;
  let link = null;

  if (execution.name === "create_note") {
    title = locale === "en-US" ? "Creating note" : "Criando nota";
    if (execution.result?.noteId) {
      link = routes.notes.details(orgId, execution.result.noteId);
    }
  } else if (execution.name.startsWith("search_")) {
    title = locale === "en-US" ? "Searching records" : "Pesquisando registros";
  } else if (execution.name.includes("update_note")) {
    title = locale === "en-US" ? "Updating note" : "Atualizando nota";
  } else if (execution.name === "consult_brain" || execution.name === "get_brain_structure") {
    title = locale === "en-US" ? "Consulting Knowledge Base" : "Consultando Base de Conhecimento";
  } else {
    // Make snake_case into human readable Title Case
    title = execution.name
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Adjust title tense if completed
  if (!execution.isRunning) {
    title = title
      .replace("Criando", "Criou")
      .replace("Pesquisando", "Pesquisou")
      .replace("Atualizando", "Atualizou")
      .replace("Consultando", "Consultou");
    title = title
      .replace("Creating", "Created")
      .replace("Searching", "Searched")
      .replace("Updating", "Updated")
      .replace("Consulting", "Consulted");
  }

  return (
    <div className="mb-1.5 flex w-fit items-center gap-1.5 rounded-full bg-neutral-100/40 px-2.5 py-1 text-[11px] font-medium text-neutral-500 transition-opacity hover:opacity-100 opacity-80 dark:bg-neutral-800/30 dark:text-neutral-400">
      {execution.isRunning ? (
        <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
      ) : execution.success ? (
        <CheckCircle2 className="h-3 w-3 text-green-500/60" />
      ) : (
        <XCircle className="h-3 w-3 text-red-400/60" />
      )}
      <span>{title}</span>
      {link && (
        <Link
          href={link}
          onClick={(e) => e.stopPropagation()}
          className="ml-1 text-brand-yellow flex items-center gap-0.5 text-[10px] font-semibold hover:underline"
        >
          {t.open} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
};

const ActionExecutionGroup = ({ executions, orgId }: { executions: any[]; orgId: string }) => {
  const [open, setOpen] = useState(false);
  const { locale } = useLanguage();
  
  if (!executions || executions.length === 0) return null;

  const runningCount = executions.filter((e: any) => e.isRunning).length;
  const failedCount = executions.filter((e: any) => !e.isRunning && !e.success).length;

  const text = locale === "en-US"
    ? `${executions.length} agent action${executions.length > 1 ? "s" : ""}`
    : `${executions.length} ${executions.length > 1 ? "ações" : "ação"} do agente`;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
      >
        <div className="flex h-4 w-4 items-center justify-center">
          {runningCount > 0 ? (
            <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
          ) : failedCount > 0 ? (
            <XCircle className="h-3 w-3 text-red-400/60" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-green-500/60" />
          )}
        </div>
        <span>{text}</span>
        {open ? <ChevronUp className="h-3 w-3 text-neutral-400" /> : <ChevronDown className="h-3 w-3 text-neutral-400" />}
      </button>
      
      {open && (
        <div className="mt-1.5 ml-4 flex flex-col gap-0.5 border-l border-neutral-200/50 pl-3 dark:border-neutral-800/50">
          {executions.map((exec: any, idx: number) => (
            <ActionExecutionCard key={idx} execution={exec} orgId={orgId} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function ChatInterface({
  chatId,
  variant = "fullPage",
  onClose,
}: {
  chatId?: string;
  variant?: ChatInterfaceVariant;
  onClose?: () => void;
} = {}) {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const pathname = usePathname();
  const { t, locale } = useLanguage();
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
  const [isSharing, setIsSharing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [contextItems, setContextItems] = useState<{ type: string; id: string; title: string }[]>(
    []
  );
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

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
      setSelectedModel(models.find((m) => m.id === "gpt-5.4-mini") || models[0]);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (chatId) {
      didInitializeNewSessionRef.current = false;
      return;
    }
    if (didInitializeNewSessionRef.current) return;

    // Se estivermos no modal (widget) e já houver uma conversa em andamento na sessão global,
    // apenas mantemos ela! Caso contrário, iniciamos uma nova conversa.
    if (variant === "widget" && messages.length > 0) {
      didInitializeNewSessionRef.current = true;
      return;
    }

    didInitializeNewSessionRef.current = true;
    createNewSession();
  }, [chatId, createNewSession, variant, messages.length]);

  useEffect(() => {
    if (chatId && !isChatSessionId(chatId)) {
      router.replace(`/${orgId}/weave-ai/chat`);
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
    if (pathname !== `/${orgId}/weave-ai/chat`) return;
    if (messages.length === 0) return;
    router.replace(`/${orgId}/weave-ai/chat/${currentSession.id}`);
  }, [chatId, currentSession?.id, messages.length, pathname, router]);

  const handleSendText = async (messageText: string) => {
    if (!messageText.trim() || isTyping || !canSendAiMessage) return;

    const noteIds = contextItems.filter((item) => item.type === "note").map((item) => item.id);
    const projectIds = contextItems
      .filter((item) => item.type === "project")
      .map((item) => item.id);

    const rawSessionId = currentSession?.id || chatId;
    const sessionId = isChatSessionId(rawSessionId) ? rawSessionId : undefined;

    await sendMessage({
      message: messageText,
      model: {
        name: selectedModel?.provider || selectedModel?.name || "auto",
        version: selectedModel?.id || selectedModel?.version,
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

  const handleSend = async () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    await handleSendText(message);
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

  const handleShareChat = async () => {
    if (!chatId) return;
    setIsSharing(true);
    try {
      const shareToken = await shareChatSession(chatId);
      const url = `${window.location.origin}/${orgId}/weave-ai/share/${shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success(
        locale === "en-US"
          ? "Link copied to clipboard!"
          : "Link copiado para área de transferência!"
      );
    } catch (error) {
      toast.error(locale === "en-US" ? "Error sharing chat" : "Erro ao compartilhar conversa");
    } finally {
      setIsSharing(false);
    }
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

  const handleFeedbackSubmit = async (
    messageId: string,
    rating: "like" | "dislike" | null,
    comment?: string
  ) => {
    try {
      await submitMessageFeedback(messageId, rating, comment);
      setFeedbackState((prev) => ({
        ...prev,
        [messageId]: { rating, comment: comment || "", showComment: false },
      }));
      toast.success(t.weaveAi?.feedbackSubmitted || "Obrigado pelo feedback!");
    } catch (error) {
      toast.error(t.weaveAi?.feedbackError || "Erro ao enviar feedback.");
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
    <div className="relative flex h-full flex-col bg-white dark:bg-[#1d1d1b]">
      <div className="dark:border-surface-dark-border flex flex-shrink-0 items-center justify-between border-b border-neutral-200 px-2 py-1">
        <div className="flex items-center gap-2">
          <h1 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            {variant === "widget" ? t.nav.weaveAi : chatHeaderTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {(!variant || variant === "fullPage") && chatId && messages?.length > 0 && (
            <button
              onClick={handleShareChat}
              disabled={isSharing}
              className="flex items-center gap-1.5 rounded-md text-[10px] font-medium text-neutral-500 transition hover:text-neutral-900 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {isSharing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Share2 className="h-3 w-3" />
              )}
              {locale === "en-US" ? "Share" : "Compartilhar"}
            </button>
          )}
          {variant === "widget" && (
            <>
              <Link
                href={`/${orgId}/weave-ai/chat`}
                onClick={onClose}
                className="text-[10px] font-medium text-neutral-500 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                {t.nav.weaveAiOpenFull}
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={updateScrollButtons}
        className="relative flex-1 flex-shrink-0 overflow-y-auto scroll-smooth p-2 pb-48 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-400 [&::-webkit-scrollbar-track]:bg-transparent"
      >
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {messages
            ?.filter((msg: any) => {
              if (msg.role === "system" || msg.role === "tool") return false;
              if (msg.role === "assistant" && !msg.content?.trim() && (!msg.functionExecution || msg.functionExecution.length === 0)) return false;
              return true;
            })
            .map((msg: any) => {
              const isUser = msg.role === "user";
              const messageStatus = msg?.metadata?.status;
              const isFailedUserMessage = isUser && messageStatus === "failed";
              const citations = Array.isArray(msg?.citations)
                ? msg.citations
                : Array.isArray(msg?.metadata?.citations)
                  ? msg.metadata.citations
                  : [];

              const attachedFiles = Array.isArray(msg?.metadata?.files) ? msg.metadata.files : [];
              const attachedNoteIds = Array.isArray(msg?.metadata?.noteIds)
                ? msg.metadata.noteIds
                : [];
              const attachedProjectIds = Array.isArray(msg?.metadata?.projectIds)
                ? msg.metadata.projectIds
                : [];
              const hasAttachments =
                attachedFiles.length > 0 ||
                attachedNoteIds.length > 0 ||
                attachedProjectIds.length > 0;

              let mainContent = msg.content || "";
              let reasoningText = null;
              if (!isUser) {
                const thinkMatch = mainContent.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                if (thinkMatch) {
                  reasoningText = thinkMatch[1].trim();
                  mainContent = mainContent.replace(/<think>[\s\S]*?(?:<\/think>|$)/, "").trim();
                }
              }

              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6`}
                >
                  <div
                    className={`flex flex-col ${
                      isUser
                        ? "max-w-[75%] items-end"
                        : "w-full max-w-[calc(100%-3rem)] items-start"
                    }`}
                  >
                    <div
                      className={`relative text-[13px] leading-relaxed ${
                        isUser
                          ? "rounded-2xl rounded-tr-sm bg-neutral-100 px-4 py-2.5 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
                          : "w-full bg-transparent text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <ActionExecutionGroup 
                            executions={Array.isArray(msg.functionExecution) 
                              ? msg.functionExecution.filter((exec: any) => !["get_user_profile", "get_organization_details", "get_brain_structure"].includes(exec.name))
                              : []} 
                            orgId={orgId} 
                          />
                          
                          {reasoningText && (
                            <div className="mb-2 w-fit min-w-[280px] max-w-2xl rounded-xl border border-neutral-200/60 bg-white/40 shadow-sm backdrop-blur-md dark:border-neutral-800/60 dark:bg-[#252525]/40">
                              <details className="group" open={!mainContent}>
                                <summary className="flex cursor-pointer select-none items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100">
                                  <BrainCircuit className="h-4 w-4 text-brand-yellow" />
                                  <span>{t.weaveAi.thinking || "Thinking..."}</span>
                                  <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="border-t border-neutral-200/60 px-4 py-3 dark:border-neutral-800/60">
                                  <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none opacity-80 prose-p:leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {reasoningText}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              </details>
                            </div>
                          )}
                          
                          {mainContent && (
                            <div className="prose prose-neutral prose-sm dark:prose-invert prose-pre:p-0 prose-pre:bg-transparent prose-p:leading-relaxed prose-blockquote:border-l-brand-yellow prose-blockquote:bg-neutral-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-table:border-collapse prose-table:border prose-table:border-neutral-200 prose-th:bg-neutral-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-tr:border-b dark:prose-blockquote:bg-neutral-800/50 dark:prose-table:border-neutral-800 dark:prose-th:bg-neutral-900/50 max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                  pre: ({ node, ...props }) => (
                                    <div className="group relative my-4 overflow-hidden rounded-xl border border-neutral-700/50 bg-[#1e1e1e] shadow-sm">
                                      <div className="flex items-center justify-between border-b border-neutral-700/50 bg-[#2d2d2d] px-4 py-1.5">
                                        <div className="flex gap-1.5">
                                          <div className="h-3 w-3 rounded-full bg-neutral-600/50"></div>
                                          <div className="h-3 w-3 rounded-full bg-neutral-600/50"></div>
                                          <div className="h-3 w-3 rounded-full bg-neutral-600/50"></div>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            const text = (
                                              e.currentTarget.parentElement
                                                ?.nextElementSibling as HTMLElement
                                            )?.innerText;
                                            if (text) {
                                              navigator.clipboard.writeText(text);
                                              const icon = e.currentTarget.querySelector("svg");
                                              if (icon) {
                                                const original = icon.innerHTML;
                                                icon.innerHTML =
                                                  '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
                                                icon.classList.add("text-green-400");
                                                setTimeout(() => {
                                                  icon.innerHTML = original;
                                                  icon.classList.remove("text-green-400");
                                                }, 2000);
                                              }
                                            }
                                          }}
                                          className="text-neutral-400 transition-colors hover:text-white"
                                          title="Copiar código"
                                        >
                                          <Copy className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                      <pre
                                        className="overflow-x-auto p-4 text-[13px] leading-relaxed"
                                        {...props}
                                      />
                                    </div>
                                  ),
                                  code: ({ node, inline, ...props }: any) =>
                                    inline ? (
                                      <code
                                        className="rounded bg-neutral-200/50 px-1.5 py-0.5 font-mono text-[12px] text-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-200"
                                        {...props}
                                      />
                                    ) : (
                                      <code {...props} />
                                    ),
                                  table: ({ node, ...props }: any) => (
                                    <div className="not-prose my-5 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-700/80 dark:bg-[#1d1d1b]">
                                      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50/80 px-4 py-2.5 dark:border-neutral-700/80 dark:bg-[#2d2d2d]">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                                          <Table className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              const tableEl = e.currentTarget
                                                .closest(".not-prose")
                                                ?.querySelector("table");
                                              if (!tableEl) return;
                                              const rows = Array.from(
                                                tableEl.querySelectorAll("tr")
                                              );
                                              const text = rows
                                                .map((row) =>
                                                  Array.from(row.querySelectorAll("th, td"))
                                                    .map((cell) => cell.textContent?.trim() || "")
                                                    .join("\t")
                                                )
                                                .join("\n");
                                              navigator.clipboard.writeText(text);

                                              const icon = e.currentTarget.querySelector("svg");
                                              if (icon) {
                                                const original = icon.innerHTML;
                                                icon.innerHTML =
                                                  '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
                                                icon.classList.add("text-green-500");
                                                setTimeout(() => {
                                                  icon.innerHTML = original;
                                                  icon.classList.remove("text-green-500");
                                                }, 2000);
                                              }
                                            }}
                                            className="text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
                                            title="Copiar dados"
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </button>
                                          <div className="h-3.5 w-px bg-neutral-300 dark:bg-neutral-700"></div>
                                          <button
                                            onClick={(e) => {
                                              const tableEl = e.currentTarget
                                                .closest(".not-prose")
                                                ?.querySelector("table");
                                              if (!tableEl) return;
                                              const rows = Array.from(
                                                tableEl.querySelectorAll("tr")
                                              );
                                              const csv = rows
                                                .map((row) =>
                                                  Array.from(row.querySelectorAll("th, td"))
                                                    .map((cell) => {
                                                      let text = cell.textContent?.trim() || "";
                                                      text = text.replace(/"/g, '""');
                                                      return `"${text}"`;
                                                    })
                                                    .join(",")
                                                )
                                                .join("\n");

                                              const blob = new Blob([csv], {
                                                type: "text/csv;charset=utf-8;",
                                              });
                                              const url = URL.createObjectURL(blob);
                                              const link = document.createElement("a");
                                              link.href = url;
                                              link.setAttribute(
                                                "download",
                                                `export_${Date.now()}.csv`
                                              );
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                            }}
                                            className="hover:text-brand-orange text-neutral-400 transition-colors"
                                            title="Exportar como CSV"
                                          >
                                            <Download className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="w-full overflow-x-auto">
                                        <table
                                          className="w-full text-left text-[13px] whitespace-nowrap"
                                          {...props}
                                        />
                                      </div>
                                    </div>
                                  ),
                                  thead: ({ node, ...props }: any) => (
                                    <thead
                                      className="bg-neutral-50/80 dark:bg-neutral-800/50"
                                      {...props}
                                    />
                                  ),
                                  tr: ({ node, ...props }: any) => (
                                    <tr className="group" {...props} />
                                  ),
                                  th: ({ node, ...props }: any) => (
                                    <th
                                      className="border-b border-neutral-200 px-4 py-1.5 font-semibold text-neutral-900 dark:border-neutral-700/80 dark:text-neutral-100"
                                      {...props}
                                    />
                                  ),
                                  td: ({ node, ...props }: any) => (
                                    <td
                                      className="border-b border-neutral-100 px-4 py-1.5 text-neutral-700 transition-colors group-last:border-b-0 group-hover:bg-neutral-50/50 dark:border-neutral-800/60 dark:text-neutral-300 dark:group-hover:bg-white/[0.02]"
                                      {...props}
                                    />
                                  ),
                                  a: ({ node, ...props }: any) => {
                                    const href = props.href || "";
                                    const isProjectLink = href.includes("/projects/");
                                    const isNoteLink = href.includes("/notes/");
                                    const isUserLink = href.startsWith("user:");

                                    if (isUserLink) {
                                      const rawAvatar = href.replace("user:", "");
                                      const resolvedAvatar =
                                        rawAvatar && rawAvatar !== "none"
                                          ? getStorageUrl(decodeURIComponent(rawAvatar))
                                          : null;

                                      return (
                                        <span
                                          className="text-brand-navy dark:text-brand-yellow inline-flex items-center gap-1 font-medium"
                                          title="User"
                                        >
                                          <span className="flex translate-y-[1px] items-center justify-center">
                                            {resolvedAvatar ? (
                                              <img
                                                src={resolvedAvatar}
                                                alt=""
                                                className="h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-neutral-200/80 object-cover dark:border-neutral-700/80"
                                              />
                                            ) : (
                                              <User className="h-3.5 w-3.5 shrink-0" />
                                            )}
                                          </span>
                                          <span>{props.children}</span>
                                        </span>
                                      );
                                    }

                                    if (isProjectLink || isNoteLink) {
                                      // Extract the last path segment as the entity ID (public_id or UUID)
                                      const segments = href.split("/").filter(Boolean);
                                      const lastSegment = segments[segments.length - 1] || "";
                                      const entityId = lastSegment.split("?")[0] || "";

                                      if (isProjectLink && entityId) {
                                        const project = Array.isArray(projectsOverview)
                                          ? projectsOverview.find(
                                              (p: any) =>
                                                p.id === entityId || p.public_id === entityId
                                            )
                                          : null;
                                        let resolvedHref = href;
                                        if (
                                          href.startsWith("/") &&
                                          !href.startsWith(`/${orgId}/`)
                                        ) {
                                          resolvedHref = `/${orgId}${href}`;
                                        }
                                        if (project) {
                                          resolvedHref = routes.projects.board(
                                            orgId,
                                            (project as any).public_id || entityId
                                          );
                                        }
                                        const projectIcon = (project as any)?.icon;
                                        return (
                                          <Link
                                            href={resolvedHref}
                                            className="text-brand-navy dark:text-brand-yellow inline-flex items-center gap-1 font-medium no-underline hover:no-underline"
                                          >
                                            <span className="flex translate-y-[1px] items-center justify-center">
                                              <RenderContextIcon
                                                icon={projectIcon}
                                                fallback={FolderKanban}
                                                color={(project as any)?.color}
                                              />
                                            </span>
                                            <span>{props.children}</span>
                                          </Link>
                                        );
                                      } else if (isNoteLink && entityId) {
                                        const note = Array.isArray(notesOverview)
                                          ? notesOverview.find(
                                              (n: any) =>
                                                n.id === entityId || n.public_id === entityId
                                            )
                                          : null;
                                        let resolvedHref = href;
                                        if (
                                          href.startsWith("/") &&
                                          !href.startsWith(`/${orgId}/`)
                                        ) {
                                          resolvedHref = `/${orgId}${href}`;
                                        }
                                        if (note) {
                                          resolvedHref = routes.notes.details(
                                            orgId,
                                            (note as any).public_id || entityId
                                          );
                                        }
                                        const noteIcon = (note as any)?.properties?.icon;
                                        return (
                                          <Link
                                            href={resolvedHref}
                                            className="text-brand-navy dark:text-brand-yellow inline-flex items-center gap-1 font-medium no-underline hover:no-underline"
                                          >
                                            <span className="flex translate-y-[1px] items-center justify-center">
                                              <RenderContextIcon
                                                icon={noteIcon}
                                                fallback={FileText}
                                                color={note?.priority_color}
                                              />
                                            </span>
                                            <span>{props.children}</span>
                                          </Link>
                                        );
                                      }
                                    }

                                    return (
                                      <a
                                        href={href}
                                        className="text-brand-navy hover:text-brand-orange dark:text-brand-yellow dark:hover:text-brand-orange font-medium underline underline-offset-2"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        {...props}
                                      >
                                        {props.children}
                                      </a>
                                    );
                                  },
                                }}
                              >
                                {mainContent}
                              </ReactMarkdown>
                            </div>
                          )}
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
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleFeedbackSubmit(
                                  msg.id,
                                  feedbackState[msg.id]?.rating || null,
                                  feedbackState[msg.id]?.comment
                                );
                              }}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="text"
                                placeholder={
                                  t.weaveAi.feedbackPlaceholder || "Adicionar um comentário..."
                                }
                                value={feedbackState[msg.id]?.comment || ""}
                                onChange={(e) =>
                                  setFeedbackState({
                                    ...feedbackState,
                                    [msg.id]: { ...feedbackState[msg.id], comment: e.target.value },
                                  })
                                }
                                className="focus:border-brand-yellow w-full border-b border-neutral-200 bg-transparent py-0.5 text-[9px] outline-none placeholder:text-neutral-400 dark:border-neutral-800"
                              />
                              <button
                                type="submit"
                                className="text-brand-yellow hover:bg-brand-yellow/10 flex h-5 w-5 items-center justify-center rounded-full transition-colors"
                                title="Enviar"
                              >
                                <Send className="h-2.5 w-2.5" />
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>

                    {isUser && hasAttachments && (
                      <div className="mt-1 flex flex-wrap justify-end gap-1">
                        {attachedFiles.map((f: any, idx: number) => (
                          <div
                            key={`file-${idx}`}
                            className="flex items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            <Paperclip className="h-2.5 w-2.5" />
                            <span className="max-w-[150px] truncate">
                              {f.originalName || f.name || "Arquivo"}
                            </span>
                          </div>
                        ))}
                        {attachedNoteIds.map((noteId: string, idx: number) => {
                          const note = Array.isArray(notesOverview)
                            ? notesOverview.find((n: any) => n.id === noteId)
                            : null;
                          const href = routes.notes.details(
                            orgId,
                            (note as any)?.public_id || noteId
                          );
                          const noteIcon = (note as any)?.icon || (note as any)?.properties?.icon;
                          return (
                            <Link
                              href={href}
                              key={`note-${idx}`}
                              className="flex items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                              <RenderContextIcon
                                icon={noteIcon}
                                fallback={FileText}
                                color={note?.priority_color}
                              />
                              <span className="max-w-[150px] truncate underline-offset-2 hover:underline">
                                {note?.title || "Nota"}
                              </span>
                            </Link>
                          );
                        })}
                        {attachedProjectIds.map((projectId: string, idx: number) => {
                          const project = Array.isArray(projectsOverview)
                            ? projectsOverview.find((p: any) => p.id === projectId)
                            : null;
                          const href = routes.projects.board(
                            orgId,
                            (project as any)?.public_id || projectId
                          );
                          const projectIcon =
                            (project as any)?.icon || (project as any)?.properties?.icon;
                          return (
                            <Link
                              href={href}
                              key={`proj-${idx}`}
                              className="flex items-center gap-1 rounded border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600 transition-colors hover:bg-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                            >
                              <RenderContextIcon
                                icon={projectIcon}
                                fallback={FolderKanban}
                                color={project?.color}
                              />
                              <span className="max-w-[150px] truncate underline-offset-2 hover:underline">
                                {project?.title || "Projeto"}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

          {isTyping && (
            <div className="flex gap-2">
              <div className="flex items-center px-4 py-2.5">
                <div className="flex items-center select-none">
                  <style>{`
                    @keyframes letter-glow {
                      0%, 100% {
                        opacity: 0.15;
                        filter: drop-shadow(0 0 0px rgba(255, 213, 0, 0));
                      }
                      35%, 85% {
                        opacity: 1;
                        filter: drop-shadow(0 0 2px rgba(255, 213, 0, 0.6));
                      }
                    }
                    .animate-thinking-letter {
                      display: inline-block;
                      animation: letter-glow 2s ease-in-out infinite;
                    }
                  `}</style>
                  {(t.weaveAi.thinking || "Thinking...").split("").map((char, idx) => (
                    <span
                      key={idx}
                      className="animate-thinking-letter text-brand-yellow text-xs font-bold tracking-wider"
                      style={{
                        animationDelay: `${idx * 0.08}s`,
                      }}
                    >
                      {char === " " ? "\u00A0" : char}
                    </span>
                  ))}
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

      <div
        className={`pointer-events-none absolute right-0 left-0 z-10 px-4 transition-all duration-700 ease-in-out ${
          messages?.length === 0 && !loading
            ? "top-1/2 -translate-y-1/2 bg-transparent pb-0"
            : "bottom-0 translate-y-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-4 dark:from-[#1d1d1b] dark:via-[#1d1d1b]/95 dark:to-transparent"
        }`}
      >
        <div
          className={`pointer-events-auto mx-auto flex flex-col gap-2 transition-all duration-700 ease-in-out ${
            messages?.length === 0 && !loading ? "max-w-2xl" : "max-w-4xl"
          }`}
        >
          {messages?.length === 0 && !loading && (
            <div className="animate-in fade-in flex flex-col items-center gap-4 pb-3 text-center duration-500">
              <h2 className="text-lg font-medium tracking-tight text-neutral-500 dark:text-neutral-400">
                {t.weaveAi.welcomeGreetingPrefix}{" "}
                <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                  {user?.user_name?.split(" ")[0] || user?.username || ""}
                </span>
                {", "}
                {t.weaveAi.welcomeGreetingSuffix}{" "}
                <span className="font-fredoka text-brand-yellow dark:text-brand-yellow font-semibold tracking-tight">
                  Weave AI
                </span>{" "}
                {t.weaveAi.welcomeGreetingAction}
              </h2>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {[
                  t.weaveAi.suggestionTask,
                  t.weaveAi.suggestionProject,
                  t.weaveAi.suggestionSchedule,
                  t.weaveAi.suggestionResearch,
                  t.weaveAi.suggestionSummarize,
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-full border border-neutral-200/60 bg-white/50 px-3 py-1.5 text-[10px] font-medium text-neutral-600 transition-all hover:bg-neutral-100 dark:border-neutral-800/60 dark:bg-neutral-900/40 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
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

          <div
            className={`focus-within:border-brand-yellow/50 focus-within:ring-brand-yellow/20 dark:border-surface-dark-border-strong dark:focus-within:border-brand-yellow dark:focus-within:ring-brand-yellow/30 relative flex flex-col gap-1 rounded-2xl border border-neutral-300/80 bg-white/70 p-2 backdrop-blur-lg transition-all duration-700 focus-within:ring-1 dark:border-neutral-700/80 dark:bg-[#252525]/70 ${
              messages?.length === 0 && !loading
                ? "shadow-2xl shadow-black/5 dark:shadow-black/40"
                : "shadow-lg shadow-black/5 dark:shadow-black/20"
            }`}
          >
            {/* Elegant Inner Cloud Glow */}
            <div
              className={`absolute inset-0 -z-10 overflow-hidden rounded-2xl transition-opacity duration-1000 ${
                messages?.length === 0 && !loading ? "opacity-100" : "opacity-0"
              }`}
            >
              <div 
                className="absolute -left-10 top-0 h-full w-2/3 animate-pulse rounded-full bg-brand-yellow/20 blur-2xl dark:bg-brand-yellow/10" 
                style={{ animationDuration: '4s' }} 
              />
              <div 
                className="absolute -right-10 top-0 h-full w-2/3 animate-pulse rounded-full bg-sky-400/20 blur-2xl dark:bg-sky-500/10" 
                style={{ animationDuration: '5s', animationDelay: '1s' }} 
              />
            </div>

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
              className="max-h-32 min-h-[56px] w-full resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-100 dark:placeholder:text-neutral-500"
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

                {/* Options Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    title="Opções"
                    aria-label="Opções"
                    className="hover:bg-brand-beige hover:text-brand-navy dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>

                  {showOptionsMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowOptionsMenu(false)}
                      />
                      <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded border border-neutral-200 bg-white p-1 shadow-lg dark:bg-[#1d1d1b]">
                        <button
                          onClick={() => {
                            setAllowEdit(!allowEdit);
                            setShowOptionsMenu(false);
                          }}
                          className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                            {allowEdit ? (
                              <Unlock className="text-brand-yellow h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                            <span>{t.weaveAi.allowEdit}</span>
                          </div>
                          {allowEdit && (
                            <div className="bg-brand-yellow h-1.5 w-1.5 rounded-full"></div>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setAllowWebSearch(!allowWebSearch);
                            setShowOptionsMenu(false);
                          }}
                          className="hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                            <Globe
                              className={`h-3.5 w-3.5 ${allowWebSearch ? "text-brand-yellow" : ""}`}
                            />
                            <span>{t.weaveAi.webSearch}</span>
                          </div>
                          {allowWebSearch && (
                            <div className="bg-brand-yellow h-1.5 w-1.5 rounded-full"></div>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

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
                    className="border-brand-beige hover:bg-brand-beige hover:text-brand-navy dark:border-surface-dark-border dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-7 items-center gap-1 rounded-full border bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition-colors dark:bg-[#1d1d1b] dark:text-neutral-400"
                  >
                    <ModelIcon
                      model={selectedModel}
                      className="h-3.5 w-3.5 flex-shrink-0 object-contain"
                    />
                    <span className="max-w-[120px] truncate text-[10px] font-semibold text-neutral-500">
                      {loading
                        ? t.common.loading
                        : selectedModel
                          ? formatModelLabel(selectedModel)
                          : ""}
                    </span>
                    <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 text-neutral-400" />
                  </button>

                  {isModelMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsModelMenuOpen(false)}
                      />
                      <div className="dark:border-surface-dark-border absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                        <div className="max-h-48 overflow-y-auto p-0.5">
                          {models.map((model) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModel(model);
                                setIsModelMenuOpen(false);
                              }}
                              className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
                                selectedModel?.id === model.id
                                  ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                  : ""
                              }`}
                            >
                              <ModelIcon
                                model={model}
                                className="h-3.5 w-3.5 flex-shrink-0 object-contain"
                              />
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
                    className="border-brand-beige hover:bg-brand-beige hover:text-brand-navy dark:border-surface-dark-border dark:hover:bg-brand-navy/30 dark:hover:text-brand-beige flex h-7 items-center gap-1 rounded-full border bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition-colors dark:bg-[#1d1d1b] dark:text-neutral-400"
                  >
                    <AgentIcon
                      agent={selectedAgent}
                      className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover"
                    />
                    <span className="max-w-[80px] truncate text-[10px] font-semibold text-neutral-500">
                      {loading ? t.common.loading : selectedAgent?.name || t.nav.agent}
                    </span>
                    <ChevronDown className="h-2.5 w-2.5 flex-shrink-0 text-neutral-400" />
                  </button>

                  {isAgentMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsAgentMenuOpen(false)}
                      />
                      <div className="dark:border-surface-dark-border absolute right-0 bottom-full z-20 mb-2 w-56 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg dark:bg-[#1d1d1b]">
                        <div className="max-h-48 overflow-y-auto p-0.5">
                          <button
                            onClick={() => {
                              setSelectedAgentId(null);
                              setIsAgentMenuOpen(false);
                            }}
                            className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
                              !selectedAgentId
                                ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                : ""
                            }`}
                          >
                            <AgentIcon agent={null} className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Agente padrão</span>
                          </button>
                          {agents.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => {
                                setSelectedAgentId(agent.id);
                                setIsAgentMenuOpen(false);
                              }}
                              className={`hover:bg-brand-beige dark:hover:bg-brand-navy/30 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs ${
                                selectedAgentId === agent.id
                                  ? "bg-brand-beige text-brand-navy dark:bg-brand-navy/30 dark:text-brand-beige"
                                  : ""
                              }`}
                            >
                              <AgentIcon
                                agent={agent}
                                className="h-3.5 w-3.5 flex-shrink-0 rounded-full object-cover"
                              />
                              <span className="truncate">{agent.name}</span>
                            </button>
                          ))}
                        </div>
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
                onClick={() => router.push(`/${orgId}/settings/plans`)}
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
