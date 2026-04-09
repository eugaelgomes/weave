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
    <div className={cn("flex flex-col bg-white dark:bg-neutral-950", className)}>
      <div className="flex h-8 items-center justify-between border-b border-neutral-100 px-2 dark:border-neutral-900">
        <div className="flex items-center gap-1 text-[10px] font-semibold tracking-widest text-neutral-700 uppercase dark:text-neutral-200">
          <Bot className="h-3 w-3 text-brand-primary-700" />
          Chat
        </div>
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="text-neutral-400 hover:text-neutral-900 lg:hidden dark:text-neutral-500 dark:hover:text-neutral-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        <div className="mb-3">
          <button
            onClick={() => {
              createNewSession();
              // Se o chat principal está na raiz de chat/
              router.push("/app/weave-ai/chat");
              onLinkClick?.();
            }}
            className="flex w-full items-center justify-center gap-1 rounded-sm border border-neutral-200 bg-neutral-900 px-2 py-1.5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <Plus className="h-3 w-3" />
            Nova Conversa
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between px-1">
              <h3 className="text-[9px] font-semibold tracking-widest text-neutral-500 uppercase dark:text-neutral-400">
                Histórico
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
                      "flex w-full items-center gap-2 rounded-sm border border-transparent px-2 py-1.5 text-left text-[10px] transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900",
                      currentSession?.id === chat.id
                        ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                        : "text-neutral-500 dark:text-neutral-400"
                    )}
                  >
                    <MessageSquare
                      className={cn(
                        "h-3 w-3 flex-shrink-0",
                        currentSession?.id === chat.id ? "opacity-100" : "opacity-50"
                      )}
                    />
                    <span className="truncate">{chat.title || "Nova conversa"}</span>
                  </button>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 px-2 py-6 text-center opacity-50">
                  <MessageSquare className="h-5 w-5 text-neutral-400" />
                  <span className="text-[9px] text-neutral-500">Nenhuma conversa ainda</span>
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
    <div className="flex h-[calc(100vh-5rem)] flex-col space-y-2">
      <WeaveAIHeader className="border-b border-yellow-500/80 pb-1" />

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white md:flex-row dark:border-neutral-800 dark:bg-neutral-950">
        <ChatSidebar className="hidden w-52 flex-shrink-0 border-r border-neutral-100 md:flex dark:border-neutral-900" />

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/20" onClick={() => setIsMobileMenuOpen(false)} />
            <ChatSidebar
              className="relative z-50 h-full w-60 border-r border-neutral-100 bg-white dark:border-neutral-900"
              onLinkClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 items-center gap-2 border-b border-neutral-100 px-2 md:hidden dark:border-neutral-900">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-sm p-1 text-neutral-600 hover:text-yellow-600"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-[10px] font-semibold tracking-widest text-neutral-700 uppercase">
              Chat
            </span>
          </div>

          <div className="custom-scrollbar flex-1 overflow-auto bg-neutral-50 p-0 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
