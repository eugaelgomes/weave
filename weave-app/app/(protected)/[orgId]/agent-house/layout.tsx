"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { Bot, ChevronRight, Cpu, Plus, Wrench } from "lucide-react";
import GlobalLoading from "@/app/_components/ui/global-loading";
import { ModuleLayout } from "@/app/(protected)/_components/layout/module-layout";
import { SidebarSectionHeader } from "@/app/(protected)/_components/ui/sidebar-section-header";
import { AgentHouseHeader } from "@/app/(protected)/_components/ui/headers/agent-house-header";

function AgentHouseLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const orgId = params?.orgId as string;

  const base = pathname.replace(/\/+$/, "");
  const isDashboard = base === `/${orgId}/agent-house`;
  const isLlms = base === `/${orgId}/agent-house/llms`;
  const isTools = base === `/${orgId}/agent-house/tools`;

  const sidebarContent = (
    <div className="p-2">
      <SidebarSectionHeader title="Menu" />

      <ul className="mb-4 space-y-0.5">
        <li>
          <Link
            href={`/${orgId}/agent-house`}
            className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
              isDashboard
                ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Bot
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isDashboard ? "text-brand-primary-500" : "text-neutral-400"
                }`}
              />
              <span className="truncate">Agentes</span>
            </div>
            {isDashboard && <ChevronRight className="h-3 w-3 text-neutral-400" />}
          </Link>
        </li>
      </ul>

      <SidebarSectionHeader title="Configurações" />
      <ul className="mb-4 space-y-0.5">
        <li>
          <Link
            href={`/${orgId}/agent-house/llms`}
            className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
              isLlms
                ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Cpu
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isLlms ? "text-brand-primary-500" : "text-neutral-400"
                }`}
              />
              <span className="truncate">Conexões LLM</span>
            </div>
            {isLlms && <ChevronRight className="h-3 w-3 text-neutral-400" />}
          </Link>
        </li>
        <li>
          <Link
            href={`/${orgId}/agent-house/tools`}
            className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
              isTools
                ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Wrench
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isTools ? "text-brand-primary-500" : "text-neutral-400"
                }`}
              />
              <span className="truncate">Ferramentas Custom</span>
            </div>
            {isTools && <ChevronRight className="h-3 w-3 text-neutral-400" />}
          </Link>
        </li>
      </ul>
    </div>
  );

  return (
    <ModuleLayout
      header={<AgentHouseHeader />}
      sidebarContent={sidebarContent}
    >
      {children}
    </ModuleLayout>
  );
}

export default function AgentHouseLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <GlobalLoading fullScreen={false} />;
  }

  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/";
    }
    return null;
  }

  return <AgentHouseLayoutContent>{children}</AgentHouseLayoutContent>;
}
