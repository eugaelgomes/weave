"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, LayoutTemplate, Settings, Plus, Search, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeaveAIHeader } from "../../_components/ui/headers/weave-ai-header";
import { useAgent } from "@/app/_contexts/agent-context";

interface AgentSidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

function AgentSidebar({ className, onLinkClick }: AgentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { agents } = useAgent();

  return (
    <div className={cn("flex flex-col bg-white dark:bg-neutral-950", className)}>
      <div className="flex h-8 items-center justify-between border-b border-neutral-100 px-2 dark:border-neutral-900">
        <div className="flex items-center gap-1 text-[10px] font-semibold tracking-widest text-neutral-700 dark:text-neutral-200">
          <Bot className="h-3 w-3 text-yellow-500" />
          Agent Studio
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
              router.push("/app/weave-ai/agent/new");
              onLinkClick?.();
            }}
            className="flex w-full items-center justify-center gap-1 rounded-sm border border-yellow-500 bg-yellow-500/95 px-2 py-1 text-[10px] font-semibold text-neutral-900 transition hover:bg-yellow-500"
          >
            <Plus className="h-3 w-3" />
            New Agent
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="mb-1 px-1 text-[9px] font-semibold tracking-widest text-neutral-500 dark:text-neutral-400">
              Library
            </h3>
            <nav className="space-y-0.5">
              <Link
                href="/app/weave-ai/agent"
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-2 rounded-sm border border-transparent px-2 py-1 text-[10px] font-medium transition",
                  pathname === "/app/weave-ai/agent" && !pathname.includes("/app/weave-ai/agent/")
                    ? "border-l-2 border-yellow-500 bg-yellow-50 text-neutral-900 dark:border-yellow-500/70 dark:bg-neutral-900"
                    : "text-neutral-500 hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400"
                )}
              >
                <Bot className="h-3 w-3" />
                Overview
              </Link>
              <Link
                href="/app/weave-ai/templates"
                onClick={onLinkClick}
                className="flex items-center gap-2 rounded-sm border border-transparent px-2 py-1 text-[10px] font-medium text-neutral-500 transition hover:border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400"
              >
                <LayoutTemplate className="h-3 w-3" />
                Templates
              </Link>
            </nav>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between px-1">
              <h3 className="text-[9px] font-semibold tracking-widest text-neutral-500 dark:text-neutral-400">
                My Agents
              </h3>
            </div>
            <nav className="space-y-0.5">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    router.push(`/app/weave-ai/agent/${agent.id}`);
                    onLinkClick?.();
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm border border-transparent px-2 py-1 text-left text-[10px] transition hover:border-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-900",
                    pathname === `/app/weave-ai/agent/${agent.id}`
                      ? "border-l-2 border-yellow-500 bg-yellow-50 text-neutral-900 dark:border-yellow-500/70 dark:bg-neutral-900"
                      : "text-neutral-500 dark:text-neutral-400"
                  )}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-semibold">{agent.name}</span>
                    <span className="truncate text-[9px] text-neutral-400">{agent.role}</span>
                  </div>
                </button>
              ))}
              {agents.length === 0 && (
                <div className="px-2 text-[9px] text-neutral-400">No agents found.</div>
              )}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col space-y-2">
      <WeaveAIHeader className="border-b border-yellow-500/80 pb-1" />

      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white md:flex-row dark:border-neutral-800 dark:bg-neutral-950">
        <AgentSidebar className="hidden w-52 flex-shrink-0 border-r border-neutral-100 md:flex dark:border-neutral-900" />

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/20" onClick={() => setIsMobileMenuOpen(false)} />
            <AgentSidebar
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
            <span className="text-[10px] font-semibold tracking-widest text-neutral-700">
              Agent Studio
            </span>
          </div>

          <div className="custom-scrollbar flex-1 overflow-auto p-0.5">{children}</div>
        </main>
      </div>
    </div>
  );
}
