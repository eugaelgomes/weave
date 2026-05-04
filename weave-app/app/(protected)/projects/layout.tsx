"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../_contexts/auth-context";
import { useProjects } from "../../_contexts/projects-context";
import {
  Folder,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { ProjectsHeader } from "../_components/ui/headers/projects-header";
import GlobalLoading from "@/app/_components/ui/global-loading";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading } = useAuth();
  const { getRecentProjects, loading: projectsLoading } = useProjects();
  const pathname = usePathname();
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const toggleProject = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  if (authLoading) {
    return <GlobalLoading fullScreen={false} />;
  }

  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/";
    }
    return null;
  }

  const recentProjects = getRecentProjects();

  const base = pathname.replace(/\/+$/, "");
  const isDashboard = base === "/projects";
  const currentProjectId =
    base.startsWith("/projects/") && base !== "/projects"
      ? base.split("/projects/")[1]?.split("/")[0] ?? null
      : null;

  const sidebarContent = (
    <div className="p-2.5">
      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        Menu
      </h2>

      <ul className="mb-4 space-y-0.5">
        <li>
          <Link
            href="/projects"
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

      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        Meus Projetos
      </h2>

      <ul className="space-y-0.5">
        {recentProjects.map((project) => {
          const isActive = currentProjectId === project.id;
          const hasSubprojects = project.subprojects && project.subprojects.length > 0;
          const isExpanded = expandedProjects.includes(project.id);

          return (
            <li key={project.id} className="flex flex-col">
              <div className="flex w-full min-w-0 items-center">
                <div className="flex w-5 flex-shrink-0 items-center justify-center">
                  {hasSubprojects && (
                    <button
                      onClick={(e) => toggleProject(e, project.id)}
                      className="rounded p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                      aria-label={isExpanded ? "Recolher projeto" : "Expandir projeto"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  )}
                </div>

                <Link
                  href={`/projects/${project.id}`}
                  className={`group flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                    isActive
                      ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Folder
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isActive ? "text-brand-primary-500" : "text-neutral-400"
                      }`}
                    />
                    <span className="truncate">{project.title}</span>
                  </div>
                </Link>
              </div>

              {/* Subprojetos com as guias visuais em Amarelo */}
              {hasSubprojects && isExpanded && (
                <ul className="relative mt-1 ml-[17px] flex flex-col pl-4">
                  {project.subprojects?.map((sub, index) => {
                    const isSubActive = currentProjectId === sub.id;
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
                          href={`/projects/${sub.id}`}
                          className={`group mb-0.5 ml-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-all ${
                            isSubActive
                              ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
                          }`}
                        >
                          <FolderOpen
                            className={`h-3 w-3 flex-shrink-0 ${
                              isSubActive ? "text-brand-primary-500" : "text-neutral-400"
                            }`}
                          />
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
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 md:px-0">
      <ProjectsHeader />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Cabeçalho mobile */}
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

        {/* Layout Flexbox com Gap (Desktop) */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          {/* SIDEBAR LATERAL — Altura dinâmica da Viewport + Sticky + Overflow interno */}
          <div className="hidden w-full flex-shrink-0 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-sm md:sticky md:block md:h-[calc(100vh-auto)] md:w-[180px] dark:border-neutral-800 dark:bg-neutral-900/50">
            {sidebarContent}
          </div>

          {/* CONTEÚDO PRINCIPAL (Detail) */}
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
          ></button>

          <div className="ml-auto flex h-full w-[80%] max-w-xs flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
                Menu de Projetos
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
