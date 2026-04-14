"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquare, Bot, Plus, Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeaveAIHeader } from "../../_components/ui/headers/weave-ai-header";
import { useChat } from "@/app/_contexts/chat-context";

interface ChatSidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

function ChatSidebar({ className, onLinkClick }: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { chatHistory, currentSession, loadSession, createNewSession } = useChat();

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex h-10 items-center justify-between border-b border-neutral-100 px-3 md:h-12 dark:border-neutral-800">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-neutral-700 uppercase dark:text-neutral-200">
          <Bot className="h-4 w-4 text-brand-primary-500" />
          Histórico
        </div>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 lg:hidden dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        <div className="mb-3 px-1">
          <button
            onClick={() => {
              createNewSession();
              // Se o chat principal está na raiz de chat/
              router.push("/app/weave-ai/chat");
              onLinkClick?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-900 px-2 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Conversa
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between px-1.5">
              <h3 className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                Suas Conversas
              </h3>
            </div>
            <nav className="space-y-0.5">
              {chatHistory?.length ? (
                chatHistory.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      router.push(`/app/weave-ai/chat/${chat.id}`);
                      onLinkClick?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-[11px] transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50",
                      currentSession?.id === chat.id
                        ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-500 dark:text-neutral-400"
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        currentSession?.id === chat.id ? "opacity-100" : "opacity-50"
                      )}
                    />
                    <span className="truncate">{chat.title || "Nova conversa"}</span>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-2 py-6 text-center opacity-50">
                  <MessageSquare className="h-5 w-5 text-neutral-400" />
                  <span className="text-[10px] text-neutral-500">Nenhuma conversa ainda</span>
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
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-2">
      <WeaveAIHeader className="border-b border-yellow-500/80 pb-1" />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        
        {/* Cabeçalho mobile padronizado */}
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
            Navegação
          </span>
          <button
            type="button"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
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
          <ChatSidebar className="hidden w-56 shrink-0 md:flex md:flex-col md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:md:border-neutral-800 dark:md:bg-neutral-900/50" />

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
                className="relative z-10 h-full w-[min(20rem,100%)] bg-white shadow-xl dark:bg-neutral-950"
                onLinkClick={() => setIsMobileMenuOpen(false)}
              />
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL (Chat Area) */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-neutral-50 md:rounded-md md:border md:border-neutral-200 md:shadow-sm md:bg-white dark:bg-neutral-950 dark:md:border-neutral-800">
            <div className="custom-scrollbar flex-1 overflow-auto text-neutral-900 dark:text-neutral-100">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}