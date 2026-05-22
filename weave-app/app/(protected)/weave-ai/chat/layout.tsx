"use client";

import React, { useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Menu, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeaveAIHeader } from "../../_components/ui/headers/weave-ai-header";
import { useChat } from "@/app/_contexts/chat-context";
import { useLanguage } from "@/app/_contexts/language-context";

interface ChatSidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

function ChatSidebar({ className, onLinkClick }: ChatSidebarProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const {
    chatHistory,
    currentSession,
    createNewSession,
    deleteSession,
    loadChatHistory,
    hasMoreHistory,
    loading,
  } = useChat();

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm(t.weaveAi.deleteConfirm);
    if (!confirmed) return;

    const deleted = await deleteSession(sessionId);
    if (!deleted) return;

    if (currentSession?.id === sessionId) {
      router.push("/weave-ai/chat");
      onLinkClick?.();
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            {t.weaveAi.yourChats}
          </h2>
          {onLinkClick && (
            <button
              onClick={onLinkClick}
              className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 lg:hidden dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              aria-label={t.weaveAi.closeMenu || t.common.close}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <button
            onClick={() => {
              flushSync(() => {
                createNewSession();
              });
              router.push("/weave-ai/chat");
              onLinkClick?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-[11px] font-medium text-neutral-600 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Plus className="h-3.5 w-3.5" />
            {t.weaveAi.newChat}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <h3 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
                {t.weaveAi.history}
              </h3>
            </div>
            <nav className="space-y-0">
              {chatHistory?.length ? (
                <>
                  {chatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-md border border-transparent px-0.5 py-0.5 transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                        currentSession?.id === chat.id ? "bg-neutral-100 dark:bg-neutral-800" : ""
                      )}
                    >
                      <button
                        onClick={() => {
                          router.push(`/weave-ai/chat/${chat.id}`);
                          onLinkClick?.();
                        }}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-0.5 py-0 text-left text-[11px]",
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
                      className="mt-1 w-full rounded-md py-1 text-[10px] text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    >
                      {loading ? t.weaveAi.loadingMore || t.common.loading : t.weaveAi.loadMore}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-2 py-6 text-center opacity-50">
                  <span className="text-[10px] text-neutral-500">{t.weaveAi.noChats}</span>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-2">
      <WeaveAIHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Cabeçalho mobile padronizado */}
        <div className="dark:border-surface-dark-border flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 md:hidden dark:bg-[#1d1d1b]">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
            Navegação
          </span>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="dark:border-surface-dark-border-strong flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            {isMobileMenuOpen ? (
              <>
                <X className="h-3.5 w-3.5" />
                Fechar menu
              </>
            ) : (
              <>
                <Menu className="h-3.5 w-3.5" />
                Abrir menu
              </>
            )}
          </button>
        </div>

        {/* Layout Flexbox com Gap (Desktop) */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          {/* SIDEBAR LATERAL — Painel flutuante gerido puramente por Flexbox (sem heights artificiais) */}
          <ChatSidebar className="hidden w-full shrink-0 md:flex md:w-[180px] md:flex-col md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:md:border-neutral-800 dark:md:bg-neutral-900/50" />

          {/* Modal Mobile */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar menu"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <ChatSidebar
                className="relative z-10 ml-auto h-full w-[80%] max-w-xs bg-white dark:bg-[#1d1d1b]"
                onLinkClick={() => setIsMobileMenuOpen(false)}
              />
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL (Chat Area) */}
          <main className="dark:shadow-surface-dark-sm flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-neutral-50 md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:bg-[#1d1d1b] dark:md:border-neutral-800">
            <div className="custom-scrollbar flex-1 overflow-auto text-neutral-900 dark:text-neutral-100">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
