"use client";

import React from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bot, Plus, Trash2, MessageSquare, Cpu, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeaveAIHeader } from "@/app/(protected)/_components/ui/headers/weave-ai-header";
import { useChat, ChatProvider } from "@/app/_contexts/chat-context";
import { useAgent, AgentProvider } from "@/app/_contexts/agent-context";
import { NotesProvider } from "@/app/_contexts/notes-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { ModuleLayout } from "@/app/(protected)/_components/layout/module-layout";
import { SidebarSectionHeader } from "@/app/(protected)/_components/ui/sidebar-section-header";
import { routes } from "@/app/_utils/routes";

function WeaveAiSidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  const pathname = usePathname();
  const { t } = useLanguage();

  const { agents } = useAgent();
  const {
    chatHistory,
    currentSession,
    createNewSession,
    deleteSession,
    loadChatHistory,
    hasMoreHistory,
    loading,
  } = useChat();

  const base = pathname.replace(/\/+$/, "");

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm(t.weaveAi.deleteConfirm);
    if (!confirmed) return;

    const deleted = await deleteSession(sessionId);
    if (!deleted) return;

    if (currentSession?.id === sessionId) {
      router.push(routes.weaveAi.chat(orgId));
      onLinkClick?.();
    }
  };

  return (
    <div className="flex w-full flex-col px-2 py-3">
      {/* AGENTS SECTION */}
      <div className="mb-6">
        <SidebarSectionHeader title="Agentes" />

        <button
          type="button"
          onClick={() => {
            router.push(routes.weaveAi.newAgent(orgId));
            onLinkClick?.();
          }}
          className="dark:border-surface-dark-border mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-900 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo agente
        </button>

        <ul className="space-y-0.5">
          {agents.map((agent) => {
            const active = base === `/weave-ai/agents/${agent.id}`;
            return (
              <li key={agent.id}>
                <button
                  type="button"
                  onClick={() => {
                    router.push(routes.weaveAi.agentDetails(orgId, agent.id));
                    onLinkClick?.();
                  }}
                  className={cn(
                    "flex w-full flex-col rounded-md px-2 py-1.5 text-left text-xs transition-all",
                    active
                      ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Bot
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        active ? "text-brand-primary-500" : "text-neutral-400"
                      )}
                    />
                    <span className="truncate">{agent.name}</span>
                  </div>
                  {agent.role ? (
                    <span className="truncate pl-5 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                      {agent.role}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}

          {agents.length === 0 && (
            <li className="list-none px-2 text-xs text-neutral-400 italic">Nenhum agente.</li>
          )}
        </ul>
      </div>

      {/* CHATS SECTION */}
      <div>
        <SidebarSectionHeader title={t.weaveAi.yourChats} />

        <button
          onClick={() => {
            flushSync(() => {
              createNewSession();
            });
            router.push(routes.weaveAi.chat(orgId));
            onLinkClick?.();
          }}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium text-neutral-600 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {t.weaveAi.newChat}
        </button>

        <nav className="space-y-0.5">
          {chatHistory?.length ? (
            <>
              {chatHistory.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-md border border-transparent px-1 py-0.5 transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                    currentSession?.id === chat.id ? "bg-neutral-100 dark:bg-neutral-800" : ""
                  )}
                >
                  <button
                    onClick={() => {
                      router.push(routes.weaveAi.chatSession(orgId, chat.id));
                      onLinkClick?.();
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-xs",
                      currentSession?.id === chat.id
                        ? "font-medium text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-500 dark:text-neutral-400"
                    )}
                  >
                    <span className="truncate">{chat.title || t.weaveAi.newChat}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteSession(chat.id);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label={t.weaveAi.deleteChat}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {hasMoreHistory && (
                <button
                  onClick={() => loadChatHistory(undefined, true)}
                  disabled={loading}
                  className="mt-2 w-full rounded-md py-1 text-[10px] text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                  {loading ? t.weaveAi.loadingMore || t.common.loading : t.weaveAi.loadMore}
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-2 py-4 text-center opacity-50">
              <span className="text-[10px] text-neutral-500">{t.weaveAi.noChats}</span>
            </div>
          )}
        </nav>
      </div>

      {/* CONFIGURATIONS SECTION */}
      <div className="mt-6">
        <SidebarSectionHeader title="Configurações" />
        <ul className="space-y-0.5">
          <li>
            <Link
              href={`/${orgId}/weave-ai/llms`}
              onClick={onLinkClick}
              className={cn(
                "group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all",
                base === "/weave-ai/llms"
                  ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
              )}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Cpu
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0",
                    base === "/weave-ai/llms" ? "text-brand-primary-500" : "text-neutral-400"
                  )}
                />
                <span className="truncate">Conexões LLM</span>
              </div>
            </Link>
          </li>
          <li>
            <Link
              href={`/${orgId}/weave-ai/tools`}
              onClick={onLinkClick}
              className={cn(
                "group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all",
                base === "/weave-ai/tools"
                  ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
              )}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Wrench
                  className={cn(
                    "h-3.5 w-3.5 flex-shrink-0",
                    base === "/weave-ai/tools" ? "text-brand-primary-500" : "text-neutral-400"
                  )}
                />
                <span className="truncate">Ferramentas Custom</span>
              </div>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

function WeaveAiLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isSandboxOpen = searchParams?.get("sandbox") === "1";

  return (
    <ModuleLayout
      header={<WeaveAIHeader />}
      sidebarContent={<WeaveAiSidebar />}
      hideSidebarOnDesktop={isSandboxOpen}
    >
      <div className="custom-scrollbar flex h-full flex-1 flex-col overflow-auto text-neutral-900 dark:text-neutral-100">
        {children}
      </div>
    </ModuleLayout>
  );
}

export default function WeaveAiLayout({ children }: { children: React.ReactNode }) {
  return <WeaveAiLayoutContent>{children}</WeaveAiLayoutContent>;
}
