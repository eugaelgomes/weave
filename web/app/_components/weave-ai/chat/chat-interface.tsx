"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, FileText, Loader2, Share2 } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { useChat, type AIModel } from "@/app/_contexts/chat-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useAgent, type Agent } from "@/app/_contexts/agent-context";
import { usePlanUsage } from "@/app/_contexts/plan-usage-context";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { isChatSessionId } from "@/app/_utils/chat-session-id";
import { shareChatSession } from "@/app/_services/ai-agent-service/agent-service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { ChatInput } from "./components/chat-input";
import { ChatMessageItem } from "./components/chat-message-item";
import { ChatScrollButtons } from "./components/chat-scroll-buttons";

export type ChatInterfaceVariant = "fullPage" | "widget";

const EMPTY_CONTEXT_ITEMS: never[] = [];

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

function formatModelLabel(model: AIModel) {
  return model.name || model.description || model.version || "Unknown Model";
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

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["png", "jpg", "jpeg", "pdf", "csv", "xls"];

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

export default function ChatInterface({
  chatId,
  variant = "fullPage",
  onClose,
  onToggleSandbox,
  onOpenSandbox,
  isSandboxOpen,
}: {
  chatId?: string;
  variant?: ChatInterfaceVariant;
  onClose?: () => void;
  onToggleSandbox?: () => void;
  onOpenSandbox?: (artifactId?: string) => void;
  isSandboxOpen?: boolean;
} = {}) {
  const router = useRouter();
  const params = useParams();

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
  const notesOverview = EMPTY_CONTEXT_ITEMS;
  const projectsOverview = EMPTY_CONTEXT_ITEMS;
  const { agents, loadAgents } = useAgent();
  const { canSendAiMessage } = usePlanUsage();

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isAgentMenuOpen, setIsAgentMenuOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const allowEdit = true;
  const [allowWebSearch, setAllowWebSearch] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextSearch, setContextSearch] = useState("");
  const [noteContextLimit, setNoteContextLimit] = useState(10);
  const [projectContextLimit, setProjectContextLimit] = useState(10);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [contextItems, setContextItems] = useState<
    { type: "note" | "project"; id: string; title: string; icon?: any; color?: string }[]
  >([]);
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
      setSelectedModel(models.find((m) => m.id === "gpt-5.4") || models[0]);
    }
  }, [models, selectedModel]);

  useEffect(() => {
    if (chatId) {
      didInitializeNewSessionRef.current = false;
      return;
    }
    if (didInitializeNewSessionRef.current) return;

    if (variant === "widget" && messages.length > 0) {
      didInitializeNewSessionRef.current = true;
      return;
    }

    didInitializeNewSessionRef.current = true;
    createNewSession();
  }, [chatId, createNewSession, variant, messages.length]);

  useEffect(() => {
    if (chatId && !isChatSessionId(chatId)) {
      router.replace(`/weave-ai/chat`);
      return;
    }
    if (chatId) {
      if (currentSession?.id === chatId && messages.length > 0) return;
      loadSession(chatId);
    }
  }, [chatId, loadSession, currentSession?.id, router]);

  useEffect(() => {
    if (chatId) return;
    if (!currentSession?.id || !isChatSessionId(currentSession.id)) return;
    const normalizedPathname = pathname.replace(/\/$/, "");
    if (
      normalizedPathname !== `/weave-ai/chat` &&
      normalizedPathname !== `/weave-ai/chat/reasonings/new` &&
      normalizedPathname !== `/chat`
    )
      return;
    if (messages.length === 0) return;

    router.replace(`/chat?c=${currentSession.id}`, { scroll: false });
  }, [chatId, currentSession?.id, messages.length, pathname, variant, router]);

  const autoOpenedArtifactRef = useRef<string | null>(null);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && Array.isArray(lastMsg.functions)) {
      const artifactCall = lastMsg.functions.find(
        (f: any) => f.name === "create_artifact" || f.name === "update_artifact"
      );
      if (artifactCall && artifactCall.arguments) {
        const executions = lastMsg.functionExecution || [];
        const execMatch: any = executions.find((e: any) => e.name === artifactCall.name);
        if (execMatch && !execMatch.isRunning && execMatch.success) {
          const artifactId = execMatch.result?.id || execMatch.result?.artifactId;
          if (artifactId && autoOpenedArtifactRef.current !== artifactId) {
            autoOpenedArtifactRef.current = artifactId;
            onOpenSandbox?.(artifactId);
          }
        }
      }
    }
  }, [messages, onOpenSandbox]);

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
        name: selectedModel?.id || "",
        version: selectedModel?.version || "",
      },
      sessionId,
      allowEdit,
      allowWebSearch,
      agentId: selectedAgentId || undefined,
      useCase: undefined,
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

    const defaultModel = models.find((m) => m.id === "gpt-5.4") || models[0];
    if (defaultModel && selectedModel?.id !== defaultModel.id) {
      setSelectedModel(defaultModel);
    }
  };

  const handleSend = async () => {
    const message = input.trim();
    if (!message) return;
    setInput("");
    await handleSendText(message);
  };

  const handleAddContext = (
    type: "note" | "project",
    id: string,
    title: string,
    icon?: any,
    color?: string
  ) => {
    if (!contextItems.find((item) => item.id === id)) {
      setContextItems((prev) => [...prev, { type, id, title, icon, color }]);
    }
  };

  const handleRemoveContext = (type: "note" | "project", id: string) => {
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
        if (!alreadyExists) nextFiles.push(file);
      });
      return nextFiles;
    });
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

    // Auto-scroll Se estiver perto do fim ou se forem as primeiras mensagens da tela
    if (distanceToBottom < 120 || messages.length <= 2) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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

  const handleShareChat = async () => {
    if (!chatId) return;
    setIsSharing(true);
    try {
      const shareToken = await shareChatSession(chatId);
      const url = `${window.location.origin}/weave-ai/share/${shareToken}`;
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
        if (!copied) throw new Error("Falha ao copiar com fallback");
      }
      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        setCopiedMessageId((prev) => (prev === messageId ? null : prev));
      }, 1200);
    } catch {
      setCopiedMessageId(null);
    }
  };

  const handleFeedbackSubmit = () => {
    // Moved feedback submit inside the component via props
  };

  useEffect(() => {
    updateScrollButtons();
  }, [messages, isTyping]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || null;
  const chatHeaderTitle = getChatHeaderTitle(messages || [], currentSession?.title);
  const normalizedContextSearch = contextSearch.trim().toLowerCase();
  const filteredNotes = useMemo(() => {
    const source = Array.isArray(notesOverview) ? notesOverview : [];
    if (!normalizedContextSearch) return source;
    return source.filter((note: any) =>
      String(note?.title || "")
        .toLowerCase()
        .includes(normalizedContextSearch)
    );
  }, [normalizedContextSearch, notesOverview]);

  const filteredProjects = useMemo(() => {
    const source = Array.isArray(projectsOverview) ? projectsOverview : [];
    if (!normalizedContextSearch) return source;
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

  const filteredMessages = messages?.filter((msg: any) => {
    if (msg.role === "system") return false;
    if (
      msg.role === "assistant" &&
      !msg.content?.trim() &&
      (!msg.functionExecution || msg.functionExecution.length === 0)
    )
      return false;
    return true;
  });

  return (
    <div className={cn("relative flex h-full flex-col", "bg-white dark:bg-[#1d1d1b]")}>
      {(messages?.length > 0 || variant === "widget" || isSandboxOpen) && (
        <div className="flex flex-shrink-0 items-center justify-between px-4 pt-4 pb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              {variant === "widget" ? t.nav.weaveAi : chatHeaderTitle}
            </h1>
            {(!variant || variant === "fullPage") && chatId && messages?.length > 0 && (
              <button
                onClick={handleShareChat}
                disabled={isSharing}
                title={locale === "en-US" ? "Share" : "Compartilhar"}
                className="flex items-center justify-center rounded-md text-neutral-400 transition hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-500 dark:hover:text-neutral-300"
              >
                {isSharing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onToggleSandbox && isSandboxOpen && (
              <button
                onClick={() => onToggleSandbox()}
                className="bg-brand-primary-100 text-brand-primary-700 dark:bg-brand-primary-900/30 dark:text-brand-primary-400 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition"
              >
                <FileText className="h-3.5 w-3.5" />
                Fechar Sandbox
              </button>
            )}

            {variant === "widget" && (
              <>
                <Link
                  href={`/weave-ai/chat`}
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
      )}

      <div
        ref={messagesContainerRef}
        onScroll={updateScrollButtons}
        className={cn(
          "relative flex-1 flex-shrink-0 overflow-y-auto scroll-smooth pb-28 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-yellow-400 [&::-webkit-scrollbar-track]:bg-transparent",
          isSandboxOpen ? "px-4 pt-2" : "p-2 pb-28"
        )}
      >
        <div
          className={cn(
            "mx-auto w-full space-y-4",
            isSandboxOpen ? "max-w-xl px-2 sm:px-4" : "max-w-2xl"
          )}
        >
          {filteredMessages?.map((msg: any, index: number) => {
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

            const isStreaming = index === filteredMessages.length - 1 && !isUser && isTyping;

            return (
              <ChatMessageItem
                key={msg.id}
                msg={msg}
                isStreaming={isStreaming}
                allMessages={messages}
                isUser={isUser}
                isFailedUserMessage={isFailedUserMessage}
                citations={citations}
                hasAttachments={hasAttachments}
                attachedFiles={attachedFiles}
                attachedNoteIds={attachedNoteIds}
                attachedProjectIds={attachedProjectIds}
                mainContent={mainContent}
                reasoningText={reasoningText}
                copiedMessageId={copiedMessageId}
                handleCopyMessage={handleCopyMessage}
                feedbackState={feedbackState}
                setFeedbackState={setFeedbackState}
                handleFeedbackSubmit={async (messageId, rating, comment) => {
                  try {
                    const { submitMessageFeedback } =
                      await import("@/app/_services/ai-agent-service/agent-service");
                    await submitMessageFeedback(messageId, rating, comment);
                    setFeedbackState((prev) => ({
                      ...prev,
                      [messageId]: { rating, comment: comment || "", showComment: false },
                    }));
                    toast.success(t.weaveAi?.feedbackSubmitted || "Obrigado pelo feedback!");
                  } catch (error) {
                    toast.error(t.weaveAi?.feedbackError || "Erro ao enviar feedback.");
                  }
                }}
                retryMessage={retryMessage}
                onOpenSandbox={onOpenSandbox}
                t={t}
                notesOverview={notesOverview}
                projectsOverview={projectsOverview}
                formatMessageDateTime={formatMessageDateTime}
              />
            );
          })}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        <ChatScrollButtons
          showScrollTopButton={showScrollTopButton}
          showScrollBottomButton={showScrollBottomButton}
          scrollToTop={scrollToTop}
          scrollToBottom={scrollToBottom}
        />
      </div>

      <ChatInput
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        canSendAiMessage={canSendAiMessage}
        loading={loading}
        isTyping={isTyping}
        messagesLength={messages?.length || 0}
        isSandboxOpen={isSandboxOpen || false}
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
        handleFilesSelected={handleFilesSelected}
        selectedFiles={selectedFiles}
        handleRemoveFile={handleRemoveFile}
        contextItems={contextItems}
        handleRemoveContext={handleRemoveContext}
        showOptionsMenu={showOptionsMenu}
        setShowOptionsMenu={setShowOptionsMenu}
        allowWebSearch={allowWebSearch}
        setAllowWebSearch={setAllowWebSearch}
        contextSearch={contextSearch}
        setContextSearch={setContextSearch}
        filteredNotes={filteredNotes}
        filteredProjects={filteredProjects}
        noteContextLimit={noteContextLimit}
        setNoteContextLimit={setNoteContextLimit}
        projectContextLimit={projectContextLimit}
        setProjectContextLimit={setProjectContextLimit}
        handleAddContext={handleAddContext}
        isModelMenuOpen={isModelMenuOpen}
        setIsModelMenuOpen={setIsModelMenuOpen}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        models={models}
        formatModelLabel={formatModelLabel}
        isAgentMenuOpen={isAgentMenuOpen}
        setIsAgentMenuOpen={setIsAgentMenuOpen}
        selectedAgent={selectedAgent}
        selectedAgentId={selectedAgentId}
        setSelectedAgentId={setSelectedAgentId}
        agents={agents}
        user={user}
        router={router}
        fileError={fileError}
        error={error}
      />
    </div>
  );
}
