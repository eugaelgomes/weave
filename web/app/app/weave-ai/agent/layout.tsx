"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, LayoutTemplate, Settings, Plus, Search, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeaveAIHeader } from "../../_components/ui/headers/weave-ai-header";

// --- Tipos & Mock Data para a Sidebar ---
interface Agent {
  id: string;
  name: string;
  role: string;
  active?: boolean;
}

const mockAgents: Agent[] = [
  { id: "1", name: "Data Analyst", role: "Data Processing", active: true },
  { id: "2", name: "Code Reviewer", role: "Development" },
  { id: "3", name: "Content Writer", role: "Marketing" },
];

// --- Componente Local: Sidebar ---
interface AgentSidebarProps {
  className?: string;
  onLinkClick?: () => void;
}

function AgentSidebar({ className, onLinkClick }: AgentSidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col bg-neutral-50 dark:bg-neutral-950", className)}>
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          <Bot className="h-4 w-4" />
          <span>Agent Studio</span>
        </div>
        {/* Botão de fechar apenas mobile */}
        {onLinkClick && (
          <button
            onClick={onLinkClick}
            className="text-neutral-500 hover:text-neutral-900 lg:hidden dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200">
            <Plus className="h-3.5 w-3.5" />
            New Agent
          </button>
        </div>

        <div className="space-y-4">
          {/* Library Section */}
          <div>
            <h3 className="mb-1.5 px-2 text-[10px] font-medium text-neutral-500 uppercase dark:text-neutral-400">
              Library
            </h3>
            <nav className="space-y-0.5">
              <Link
                href="/app/weave-ai/agent"
                onClick={onLinkClick}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  pathname === "/app/weave-ai/agent" || pathname.startsWith("/app/weave-ai/agent/")
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/50 dark:hover:text-neutral-100"
                )}
              >
                <Bot className="h-3.5 w-3.5" />
                My Agents
              </Link>
              <Link
                href="/app/weave-ai/templates"
                onClick={onLinkClick}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/50 dark:hover:text-neutral-100"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                Templates
              </Link>
            </nav>
          </div>

          {/* Recent Agents */}
          <div>
            <div className="mb-1.5 flex items-center justify-between px-2">
              <h3 className="text-[10px] font-medium text-neutral-500 uppercase dark:text-neutral-400">
                Recent
              </h3>
              <Search className="h-3 w-3 text-neutral-400" />
            </div>
            <nav className="space-y-0.5">
              {mockAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={onLinkClick}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-900/50",
                    agent.active ? "bg-white shadow-sm dark:bg-neutral-900" : ""
                  )}
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {agent.name}
                    </span>
                    <span className="truncate text-[9px] text-neutral-500">{agent.role}</span>
                  </div>
                  {agent.active && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-200 p-2 dark:border-neutral-800">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200/50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/50 dark:hover:text-neutral-100">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
    </div>
  );
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <WeaveAIHeader
        className="mb-2"
        rightContent={
          <div className="text-[10px] font-medium tracking-wider text-neutral-400 uppercase">
            Agent Studio
          </div>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden shadow-sm rounded-md border border-neutral-200 bg-white md:flex-row dark:border-neutral-800 dark:bg-neutral-950">
        {/* Sidebar - Desktop */}
        <AgentSidebar className="hidden w-56 flex-shrink-0 border-r border-neutral-200 md:flex dark:border-neutral-800" />

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <AgentSidebar
              className="relative z-50 h-full w-64 border-r border-neutral-200 bg-neutral-50 shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
              onLinkClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Conteúdo Principal */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Toggle Mobile Header */}
          <div className="flex h-10 items-center gap-2 border-b border-neutral-200 px-3 md:hidden dark:border-neutral-800">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-md p-1 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <Menu className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
            </button>
            <span className="text-xs font-bold tracking-widest text-neutral-900 uppercase dark:text-neutral-100">
              Agent Studio
            </span>
          </div>

          <div className="custom-scrollbar flex-1 overflow-auto p-0">{children}</div>
        </main>
      </div>
    </div>
  );
}
