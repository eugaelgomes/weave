"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../_contexts/auth-context";
import { useProjects } from "../../_contexts/projects-context";
import { Folder, ChevronRight, FolderOpen, LayoutDashboard, ChevronDown } from "lucide-react";
import { ProjectsHeader } from "../_components/ui/headers/projects-header";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading } = useAuth();
  const { getRecentProjects, loading: projectsLoading } = useProjects();
  const pathname = usePathname();
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

  const toggleProject = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Se não estiver autenticado, o AuthContext ou middleware deve lidar com o redirect
  // mas podemos retornar null aqui para evitar flash
  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin";
    }
    return null;
  }

  const recentProjects = getRecentProjects();

  // Verifica se está na página raiz de projects ou em um projeto específico
  const isDashboard = pathname === "/app/projects";
  // Extrai o ID do projeto da URL se existir
  const currentProjectId = !isDashboard ? pathname.split("/app/projects/")[1] : null;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <ProjectsHeader className="mb-2" />

      <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white md:flex-row dark:border-neutral-800 dark:bg-neutral-950">
        {/* SIDEBAR LATERAL */}
        <div className="w-full flex-shrink-0 overflow-y-auto border-b border-neutral-200 bg-neutral-50 md:w-[180px] md:border-r md:border-b-0 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="p-2.5">
            <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
              Menu
            </h2>

            <ul className="mb-4 space-y-0.5">
              <li>
                <Link
                  href="/app/projects"
                  className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                    isDashboard
                      ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <LayoutDashboard
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isDashboard ? "text-yellow-500" : "text-neutral-400"
                      }`}
                    />
                    <span className="truncate">Dashboard</span>
                  </div>
                  {isDashboard && <ChevronRight className="h-3 w-3 text-neutral-400" />}
                </Link>
              </li>
            </ul>

            <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
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
                      {/* Botão de expandir/recolher (apenas se tiver subprojetos) */}
                      <div className="flex w-5 flex-shrink-0 items-center justify-center">
                        {hasSubprojects && (
                          <button
                            onClick={(e) => toggleProject(e, project.id)}
                            className="rounded p-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                            aria-label={isExpanded ? "Collapse project" : "Expand project"}
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
                        href={`/app/projects/${project.id}`}
                        className={`group flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                          isActive
                            ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                            : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Folder
                            className={`h-3.5 w-3.5 flex-shrink-0 ${
                              isActive ? "text-yellow-500" : "text-neutral-400"
                            }`}
                          />
                          <span className="truncate">{project.title}</span>
                        </div>
                      </Link>
                    </div>

                    {/* SUBPROJETOS COM DESIGN DE ÁRVORE */}
                    {hasSubprojects && isExpanded && (
                      <ul className="relative mt-0.5 ml-[25px] space-y-0.5 border-l border-neutral-200 dark:border-neutral-800">
                        {project.subprojects?.map((sub) => {
                          const isSubActive = currentProjectId === sub.id;

                          return (
                            <li key={sub.id} className="relative">
                              <span className="absolute top-1/2 -left-[1px] w-3 border-t border-neutral-200 dark:border-neutral-800" />
                              <Link
                                href={`/app/projects/${sub.id}`}
                                className={`group ml-2 flex w-[calc(100%-0.5rem)] items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-all ${
                                  isSubActive
                                    ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
                                }`}
                              >
                                <FolderOpen
                                  className={`h-3 w-3 flex-shrink-0 ${
                                    isSubActive ? "text-yellow-500" : "text-neutral-400"
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
                <p className="px-2 text-xs text-neutral-400 italic">Nenhum projeto encontrado.</p>
              )}
            </ul>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL (Detail) */}
        <div className="flex flex-1 flex-col overflow-y-auto bg-white p-3 sm:p-4 dark:bg-neutral-950">
          {children}
        </div>
      </div>
    </div>
  );
}
