"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, LayoutTemplate, Plus, Menu, X, ChevronRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { WeaveAIHeader } from "../../_components/ui/headers/weave-ai-header";
import { useAgent } from "@/app/_contexts/agent-context";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { agents } = useAgent();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const base = pathname.replace(/\/+$/, "");
  const isOverview = base === "/weave-ai/agent";
  const isTemplates = base.startsWith("/weave-ai/templates");

  const sidebarContent = (
    <div className="p-2.5">
      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        Menu
      </h2>

      <button
        type="button"
        onClick={() => router.push("/weave-ai/agent/new")}
        className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-900 px-2 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:border-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        <Plus className="h-3.5 w-3.5" />
        Novo agente
      </button>

      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        Seus agentes
      </h2>

      <ul className="space-y-0.5">
        {agents.map((agent) => {
          const active = base === `/weave-ai/agent/${agent.id}`;
          return (
            <li key={agent.id}>
              <button
                type="button"
                onClick={() => router.push(`/weave-ai/agent/${agent.id}`)}
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
          <li className="list-none px-2 text-xs text-neutral-400 italic">
            Nenhum agente encontrado.
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 md:px-0">
      <WeaveAIHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-3 py-2 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
            Navegação
          </span>
          <button
            type="button"
            aria-expanded={isMobileSidebarOpen}
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            {isMobileSidebarOpen ? (
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

        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          <div className="hidden w-full flex-shrink-0 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-sm md:sticky md:block md:h-[calc(100vh-auto)] md:w-[180px] dark:border-neutral-800 dark:bg-neutral-900/50">
            {sidebarContent}
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-neutral-950 md:dark:border-neutral-800">
            {children}
          </div>
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            aria-label="Fechar menu de navegação"
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          <div className="ml-auto flex h-full w-[80%] max-w-xs flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
                Menu de Agentes
              </span>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900/40">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
