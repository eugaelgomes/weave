import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import {
  Copy,
  User,
  FolderKanban,
  FileText,
  BrainCircuit,
  ChevronDown,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Send,
  Paperclip,
  Table,
  Download,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { cn } from "@/lib/utils";

import { RenderContextIcon } from "../../shared/chat-context-icon";
import { ToolCallGroup } from "./chat-execution-cards";

export interface ChatMessageItemProps {
  msg: any;
  orgId: string;
  isUser: boolean;
  isFailedUserMessage: boolean;
  citations: any[];
  hasAttachments: boolean;
  attachedFiles: any[];
  attachedNoteIds: string[];
  attachedProjectIds: string[];
  mainContent: string;
  reasoningText: string | null;
  copiedMessageId: string | null;
  handleCopyMessage: (id: string, content: string) => void;
  feedbackState: any;
  setFeedbackState: React.Dispatch<React.SetStateAction<any>>;
  handleFeedbackSubmit: (id: string, rating: "like" | "dislike" | null, comment?: string) => void;
  retryMessage: (id: string) => void;
  onOpenSandbox?: (id?: string) => void;
  t: any;
  notesOverview: any;
  projectsOverview: any;
  formatMessageDateTime: (date: any) => string;
  allMessages?: any[];
  isStreaming?: boolean;
}

export function ChatMessageItem(props: ChatMessageItemProps) {
  const {
    msg,
    orgId,
    isUser,
    isFailedUserMessage,
    citations,
    hasAttachments,
    attachedFiles,
    attachedNoteIds,
    attachedProjectIds,
    mainContent,
    reasoningText,
    copiedMessageId,
    handleCopyMessage,
    feedbackState,
    setFeedbackState,
    handleFeedbackSubmit,
    retryMessage,
    onOpenSandbox,
    t,
    notesOverview,
    projectsOverview,
    formatMessageDateTime,
    allMessages = [],
  } = props;

  if (msg.role === "tool") return null;

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-6`}>
      <style>{`
        .chat-avatar-img + .chat-dummy-link .chat-dummy-icon {
          display: none !important;
        }
      `}</style>
      <div
        className={`flex flex-col ${
          isUser ? "max-w-[75%] items-end" : "w-full max-w-[calc(100%-3rem)] items-start"
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
            <div className="flex flex-col gap-2">
              {hasAttachments && (
                <div className="mb-1 flex flex-wrap gap-2">
                  {attachedFiles.map((f: any, idx: number) => {
                    let fileUrl = undefined;
                    const rawUrl = f.url || f.path || f.public_url;
                    if (rawUrl) {
                      fileUrl = getStorageUrl(rawUrl);
                    } else if (typeof window !== "undefined" && f instanceof File) {
                      fileUrl = URL.createObjectURL(f);
                    }
                    const FileWrapper = fileUrl ? "a" : "div";
                    const fileProps = fileUrl
                      ? {
                          href: fileUrl,
                          target: "_blank",
                          rel: "noopener noreferrer",
                        }
                      : {};

                    return (
                      <FileWrapper
                        key={`file-${idx}`}
                        {...fileProps}
                        className={cn(
                          "flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-neutral-200/50 bg-white/50 p-2 text-center text-[10px] font-medium text-neutral-600 shadow-sm dark:border-neutral-700/50 dark:bg-black/20 dark:text-neutral-300",
                          fileUrl
                            ? "cursor-pointer transition-colors hover:bg-white dark:hover:bg-black/40"
                            : ""
                        )}
                        title={f.originalName || f.name || "Arquivo"}
                      >
                        <Paperclip className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="w-full truncate leading-tight">
                          {f.originalName || f.name || "Arquivo"}
                        </span>
                      </FileWrapper>
                    );
                  })}
                  {attachedNoteIds.map((noteId: string, idx: number) => {
                    const note = Array.isArray(notesOverview)
                      ? notesOverview.find((n: any) => n.id === noteId)
                      : null;
                    const href = routes.notes.details(orgId, (note as any)?.public_id || noteId);
                    const noteIcon = (note as any)?.icon || (note as any)?.properties?.icon;
                    return (
                      <Link
                        href={href}
                        key={`note-${idx}`}
                        title={note?.title || "Nota"}
                        className="flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-neutral-200/50 bg-white/50 p-2 text-center text-[10px] font-medium text-neutral-600 shadow-sm transition-colors hover:bg-white dark:border-neutral-700/50 dark:bg-black/20 dark:text-neutral-300 dark:hover:bg-black/40"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-70">
                          <RenderContextIcon
                            icon={noteIcon}
                            fallback={FileText}
                            color={note?.priority_color}
                          />
                        </span>
                        <span className="w-full truncate leading-tight">
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
                        title={project?.title || "Projeto"}
                        className="flex h-16 w-16 flex-col items-center justify-center gap-1.5 rounded-lg border border-neutral-200/50 bg-white/50 p-2 text-center text-[10px] font-medium text-neutral-600 shadow-sm transition-colors hover:bg-white dark:border-neutral-700/50 dark:bg-black/20 dark:text-neutral-300 dark:hover:bg-black/40"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center opacity-70">
                          <RenderContextIcon
                            icon={projectIcon}
                            fallback={FolderKanban}
                            color={project?.color}
                          />
                        </span>
                        <span className="w-full truncate leading-tight">
                          {project?.title || "Projeto"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
              {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(() => {
                const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
                if (toolCalls.length > 0) {
                  return (
                    <ToolCallGroup
                      toolCalls={toolCalls}
                      allMessages={allMessages}
                      orgId={orgId}
                      onOpenSandbox={onOpenSandbox}
                    />
                  );
                }
                return null;
              })()}

              {reasoningText && (
                <div className="mb-2 w-fit max-w-2xl min-w-[280px] rounded-xl border border-neutral-200/60 bg-white/40 shadow-sm backdrop-blur-md dark:border-neutral-800/60 dark:bg-[#252525]/40">
                  <details className="group" open={!mainContent}>
                    <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-[13px] font-medium text-neutral-600 transition-colors select-none hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100">
                      <BrainCircuit className="text-brand-yellow h-4 w-4" />
                      <span>{t.weaveAi.thinking || "Thinking..."}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="border-t border-neutral-200/60 px-4 py-3 dark:border-neutral-800/60">
                      <div className="prose prose-sm prose-neutral dark:prose-invert prose-p:leading-relaxed max-w-none opacity-80">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{reasoningText}</ReactMarkdown>
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {mainContent && (
                <div
                  className="prose prose-neutral prose-sm dark:prose-invert prose-pre:p-0 prose-pre:bg-transparent prose-p:leading-relaxed prose-blockquote:border-l-brand-yellow prose-blockquote:bg-neutral-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-table:border-collapse prose-table:border prose-table:border-neutral-200 prose-th:bg-neutral-50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-tr:border-b dark:prose-blockquote:bg-neutral-800/50 dark:prose-table:border-neutral-800 dark:prose-th:bg-neutral-900/50 max-w-none [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:ml-5 [&_ul]:list-disc"
                  style={
                    props.isStreaming
                      ? {
                          maskImage:
                            "linear-gradient(to bottom, black 0%, black calc(100% - 36px), transparent 100%)",
                          WebkitMaskImage:
                            "linear-gradient(to bottom, black 0%, black calc(100% - 36px), transparent 100%)",
                          paddingBottom: "12px",
                        }
                      : undefined
                  }
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeHighlight]}
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
                                  e.currentTarget.parentElement?.nextElementSibling as HTMLElement
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
                                  const rows = Array.from(tableEl.querySelectorAll("tr"));
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
                                  const rows = Array.from(tableEl.querySelectorAll("tr"));
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
                                  link.setAttribute("download", `export_${Date.now()}.csv`);
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
                        <thead className="bg-neutral-50/80 dark:bg-neutral-800/50" {...props} />
                      ),
                      tr: ({ node, ...props }: any) => <tr className="group" {...props} />,
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
                      img: ({ node, src, ...props }: any) => {
                        const resolvedSrc = src
                          ? getStorageUrl(decodeURIComponent(src))
                          : undefined;
                        const isAvatar = src && src.includes("avatar");
                        return (
                          <img
                            src={resolvedSrc}
                            className={cn(
                              "inline-block align-middle",
                              isAvatar
                                ? "chat-avatar-img mr-1 h-4 w-4 rounded-full object-cover"
                                : "max-w-full rounded-md object-contain"
                            )}
                            {...props}
                          />
                        );
                      },
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
                          const segments = href.split("/").filter(Boolean);
                          const lastSegment = segments[segments.length - 1] || "";
                          const entityId = lastSegment.split("?")[0].split("#")[0] || "";

                          if (isProjectLink && entityId) {
                            const project = Array.isArray(projectsOverview)
                              ? projectsOverview.find(
                                  (p: any) => p.id === entityId || p.public_id === entityId
                                )
                              : null;
                            let resolvedHref = href;
                            if (href.startsWith("/") && !href.startsWith(`/${orgId}/`)) {
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
                                  (n: any) => n.id === entityId || n.public_id === entityId
                                )
                              : null;
                            let resolvedHref = href;
                            if (href.startsWith("/") && !href.startsWith(`/${orgId}/`)) {
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

                        const isDummyLink = href === "#" || href.endsWith("#");
                        if (isDummyLink) {
                          return (
                            <span
                              className="chat-dummy-link text-brand-navy dark:text-brand-yellow inline-flex items-center gap-1 font-medium"
                              title="User"
                            >
                              <span className="chat-dummy-icon flex translate-y-[1px] items-center justify-center">
                                <User className="h-3.5 w-3.5 shrink-0" />
                              </span>
                              <span>{props.children}</span>
                            </span>
                          );
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
              className={`flex items-center gap-3 opacity-40 transition-opacity hover:opacity-100 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
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
                      className={`flex items-center transition-colors ${
                        feedbackState[msg.id]?.rating === "like"
                          ? "text-green-600 opacity-100"
                          : "hover:text-green-600"
                      }`}
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
                      className={`flex items-center transition-colors ${
                        feedbackState[msg.id]?.rating === "dislike"
                          ? "text-red-600 opacity-100"
                          : "hover:text-red-600"
                      }`}
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
                    placeholder={t.weaveAi.feedbackPlaceholder || "Adicionar um comentário..."}
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
      </div>
    </div>
  );
}
