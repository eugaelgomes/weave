"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { ChevronRight, LayoutDashboard, ChevronDown } from "lucide-react";
import { ProjectsHeader } from "@/app/(protected)/_components/ui/headers/projects-header";
import GlobalLoading from "@/app/_components/ui/global-loading";
import { ProjectIcon } from "@/app/(protected)/projects/_components/project-icon";
import type {
  SubProject,
  ProjectProperties,
} from "@/app/_services/projects-service/projects-service";
import { ModuleLayout } from "@/app/(protected)/_components/layout/module-layout";
import { SidebarSectionHeader } from "@/app/(protected)/_components/ui/sidebar-section-header";
import { TagsProvider } from "@/app/_contexts/tags-context";
import { TaskPrioritiesProvider } from "@/app/_contexts/task-priorities-context";
import { NotesProvider } from "@/app/_contexts/notes-context";

function subprojectProperties(sub: SubProject): ProjectProperties | undefined {
  if (!sub.properties) return undefined;
  if (typeof sub.properties === "string") {
    try {
      return JSON.parse(sub.properties) as ProjectProperties;
    } catch {
      return undefined;
    }
  }
  return sub.properties;
}

// ---------------------------------------------------------------------------
// ProjectsLayoutContent — sidebar content that consumes projects/engine context
// ---------------------------------------------------------------------------

function ProjectsLayoutContent({ children }: { children: React.ReactNode }) {
  const { getRecentProjects } = useProjects();
  const pathname = usePathname();
  const params = useParams();
  
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

  const toggleProject = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  const recentProjects = getRecentProjects();
  const signalsByProjectPublicId = React.useMemo(() => {
    const map = new Map<
      string,
      { hasNew: boolean; actions: number; risk: "low" | "medium" | "high" }
    >();
    // Signals calculation removed along with Weave Engine feed
    return map;
  }, []);

  const base = pathname.replace(/\/+$/, "");
  const isDashboard = base === `/projects`;
  const currentProjectId =
    base.startsWith(`/projects/`) && base !== `/projects`
      ? (base.split(`/projects/`)[1]?.split("/")[0] ?? null)
      : null;

  const sidebarContent = (
    <div className="py-2.5">
      <SidebarSectionHeader title="Menu" className="mx-0 px-2" />

      <ul className="mb-4 space-y-0.5">
        <li>
          <Link
            href={`/projects`}
            className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
              isDashboard
                ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <LayoutDashboard
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isDashboard ? "text-brand-primary-500" : "text-neutral-400"
                }`}
              />
              <span className="truncate">Overview</span>
            </div>
            {isDashboard && <ChevronRight className="h-3 w-3 text-neutral-400" />}
          </Link>
        </li>
      </ul>

      <SidebarSectionHeader title="Meus Projetos" className="mx-0 px-2" />

      <ul className="space-y-0.5">
        {recentProjects.map((project) => {
          const isActive = currentProjectId === project.public_id;
          const signal = signalsByProjectPublicId.get(project.public_id || "");

          const hasSubprojects = project.subprojects && project.subprojects.length > 0;
          const isExpanded = expandedProjects.includes(project.id);

          return (
            <li key={project.id} className="flex flex-col">
              <div className="flex w-full min-w-0 items-center gap-0.5 px-2">
                {hasSubprojects && (
                  <button
                    type="button"
                    onClick={(e) => toggleProject(e, project.id)}
                    className="flex-shrink-0 rounded p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    aria-label={isExpanded ? "Recolher projeto" : "Expandir projeto"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                )}

                <Link
                  href={`/projects/${project.public_id}`}
                  className={`group flex min-w-0 flex-1 items-center rounded-md py-1.5 text-xs transition-all ${
                    isActive
                      ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <ProjectIcon icon={project.icon} color={project.color} size="xs" />
                    <span className="truncate">{project.title}</span>
                    {signal?.risk === "high" ? (
                      <span
                        className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-red-500"
                        title="Risco alto"
                      />
                    ) : signal?.risk === "medium" ? (
                      <span
                        className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                        title="Risco médio"
                      />
                    ) : null}
                    {signal?.actions ? (
                      <span className="bg-brand-primary-500/15 text-brand-primary-700 dark:text-brand-primary-400 rounded-full px-1.5 py-0.5 text-[9px] font-semibold">
                        {signal.actions}
                      </span>
                    ) : null}
                    {signal?.hasNew ? (
                      <span className="border-brand-primary-500/50 text-brand-primary-700 dark:text-brand-primary-400 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold">
                        Novo
                      </span>
                    ) : null}
                  </div>
                </Link>
              </div>

              {/* Subprojetos com as guias visuais em Amarelo */}
              {hasSubprojects && isExpanded && (
                <ul className="relative mt-1 ml-[17px] flex flex-col">
                  {project.subprojects?.map((sub, index) => {
                    const isSubActive = currentProjectId === sub.public_id;
                    const subProps = subprojectProperties(sub);

                    const isLast = index === project.subprojects!.length - 1;

                    return (
                      <li key={sub.id} className="relative">
                        {/* Linha vertical contínua amarela (oculta no último nó) */}
                        {!isLast && (
                          <div className="absolute top-0 bottom-0 -left-4 border-l border-yellow-500/50 dark:border-yellow-500/50" />
                        )}

                        {/* Cotovelo arredondado amarelo ligando ao link atual */}
                        <div className="absolute top-0 -left-4 h-[15px] w-4 rounded-bl-md border-b border-l border-yellow-500/50 dark:border-yellow-500/50" />

                        <Link
                          href={`/projects/${sub.public_id}`}
                          className={`group mb-0.5 ml-1 flex items-center gap-1.5 rounded-md px-4 py-1 text-[11px] transition-all ${
                            isSubActive
                              ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
                          }`}
                        >
                          <ProjectIcon icon={subProps?.icon} color={subProps?.color} size="xs" />
                          <span className="truncate">{sub.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}

        {recentProjects.length === 0 && (
          <li className="list-none px-2 text-xs text-neutral-400 italic">
            Nenhum projeto encontrado.
          </li>
        )}
      </ul>
    </div>
  );

  return (
    <ModuleLayout header={<ProjectsHeader />} sidebarContent={sidebarContent}>
      {children}
    </ModuleLayout>
  );
}

// ---------------------------------------------------------------------------
// ProjectsLayout — provider wrapper
// ---------------------------------------------------------------------------

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <TagsProvider>
      <TaskPrioritiesProvider>
        <ProjectsLayoutContent>{children}</ProjectsLayoutContent>
      </TaskPrioritiesProvider>
    </TagsProvider>
  );
}
