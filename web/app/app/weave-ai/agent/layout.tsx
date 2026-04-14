"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, LayoutTemplate, Plus, Menu, X, ChevronRight } from "lucide-react";
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

  const isOverview = pathname === "/app/weave-ai/agent";

  return (
    <div className={cn("flex flex-col border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-950/80", className)}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200/80 px-3 dark:border-neutral-800">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-500/15 text-brand-primary-600 dark:text-brand-primary-400">
            <Bot className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">Agentes</p>
            <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">Weave AI Studio</p>
          </div>
        </div>
        {onLinkClick && (
          <button
            type="button"
            onClick={onLinkClick}
            className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-200/80 hover:text-neutral-900 lg:hidden dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-3">
        <button
          type="button"
          onClick={() => {
            router.push("/app/weave-ai/agent/new");
            onLinkClick?.();
          }}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary-500 px-3 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-brand-primary-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary-500"
        >
          <Plus className="h-4 w-4" />
          Novo agente
        </button>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Navegação
            </h3>
            <nav className="space-y-1">
              <Link
                href="/app/weave-ai/agent"
                onClick={onLinkClick}
                className={cn(
                  "group flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition",
                  isOverview
                    ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-700"
                    : "text-neutral-600 hover:bg-white/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <Bot className={cn("h-4 w-4", isOverview ? "text-brand-primary-500" : "text-neutral-400")} />
                  Visão geral
                </span>
                {isOverview && <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />}
              </Link>
              <Link
                href="/app/weave-ai/templates"
                onClick={onLinkClick}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-neutral-600 transition hover:bg-white/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-100"
              >
                <LayoutTemplate className="h-4 w-4 text-neutral-400" />
                Templates
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="mb-2 px-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Seus agentes
            </h3>
            <nav className="space-y-1">
              {agents.map((agent) => {
                const active = pathname === `/app/weave-ai/agent/${agent.id}`;
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      router.push(`/app/weave-ai/agent/${agent.id}`);
                      onLinkClick?.();
                    }}
                    className={cn(
                      "flex w-full flex-col rounded-lg px-2.5 py-2 text-left text-sm transition",
                      active
                        ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:text-neutral-50 dark:ring-neutral-700"
                        : "text-neutral-600 hover:bg-white/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900/60 dark:hover:text-neutral-100"
                    )}
                  >
                    <span className="truncate">{agent.name}</span>
                    {agent.role ? (
                      <span className="truncate text-xs font-normal text-neutral-500 dark:text-neutral-400">{agent.role}</span>
                    ) : null}
                  </button>
                );
              })}
              {agents.length === 0 && (
                <p className="rounded-lg border border-dashed border-neutral-200 bg-white/50 px-2.5 py-3 text-center text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400">
                  Nenhum agente ainda. Crie o primeiro acima.
                </p>
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
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-2">
      <WeaveAIHeader className="border-b border-neutral-200/90 pb-2 dark:border-neutral-800" />

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
          
          {/* SIDEBAR LATERAL — Painel flutuante gerido puramente por Flexbox */}
          <AgentSidebar className="hidden w-60 shrink-0 md:flex md:flex-col md:rounded-md md:border md:border-neutral-200 md:bg-white md:shadow-sm dark:md:border-neutral-800 dark:md:bg-neutral-900/50" />

          {/* Modal Mobile */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar menu"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <AgentSidebar
                className="relative z-10 h-full w-[min(20rem,100%)] shadow-xl"
                onLinkClick={() => setIsMobileMenuOpen(false)}
              />
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL (Detail) */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-neutral-950 dark:md:border-neutral-800">
            <div className="custom-scrollbar min-h-0 flex-1 overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}