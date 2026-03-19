"use client";

import React, { useState } from "react";
import { useAuth } from "../../_contexts/auth-context";
import { useProjects } from "../../_contexts/projects-context";
import ProjectsCarousel from "../_components/ui/projects/project-carousel";
import ProjectsDashboard from "../_components/ui/projects/projects-dashboard";
import ProjectsOverview from "../_components/ui/projects/projects-overview";
import { Folder, ChevronRight, FolderOpen, LayoutDashboard } from "lucide-react";

export default function ProjectsPage() {
  const { authenticated, loading: authLoading, user } = useAuth();
  const { getRecentProjects, loading: projectsLoading } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("dashboard");

  if (authLoading || projectsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin";
    }
    return null;
  }

  const recentProjects = getRecentProjects();
  const userName = String(user?.user_name || user?.username || "usuário");

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-md border border-neutral-200 bg-white md:flex-row dark:border-neutral-800 dark:bg-neutral-950">
      {/* SIDEBAR LATERAL */}
      <div className="w-full flex-shrink-0 overflow-y-auto border-b border-neutral-200 bg-neutral-50 md:w-[180px] md:border-r md:border-b-0 dark:border-neutral-800 dark:bg-neutral-900/30">
        <div className="p-2.5">
          <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Menu
          </h2>

          <ul className="mb-4 space-y-0.5">
            <li>
              <button
                onClick={() => setSelectedProjectId("dashboard")}
                className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                  selectedProjectId === "dashboard"
                    ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <LayoutDashboard
                    className={`h-3.5 w-3.5 flex-shrink-0 ${
                      selectedProjectId === "dashboard" ? "text-yellow-500" : "text-neutral-400"
                    }`}
                  />
                  <span className="truncate">Dashboard</span>
                </div>
                {selectedProjectId === "dashboard" && (
                  <ChevronRight className="h-3 w-3 text-neutral-400" />
                )}
              </button>
            </li>
          </ul>

          <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Meus Projetos
          </h2>

          <ul className="space-y-0.5">
            {recentProjects.map((project) => (
              <li key={project.id} className="flex flex-col">
                <button
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                    selectedProjectId === project.id
                      ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Folder
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        selectedProjectId === project.id ? "text-yellow-500" : "text-neutral-400"
                      }`}
                    />
                    <span className="truncate">{project.title}</span>
                  </div>
                  {selectedProjectId === project.id && (
                    <ChevronRight className="h-3 w-3 text-neutral-400" />
                  )}
                </button>

                {/* SUBPROJETOS COM DESIGN DE ÁRVORE */}
                {project.subprojects && project.subprojects.length > 0 && (
                  <ul className="relative mt-0.5 ml-[15px] space-y-0.5 border-l border-neutral-200 dark:border-neutral-800">
                    {project.subprojects.map((sub) => (
                      <li key={sub.id} className="relative">
                        <span className="absolute top-1/2 -left-[1px] w-3 border-t border-neutral-200 dark:border-neutral-800" />
                        <button
                          onClick={() => setSelectedProjectId(sub.id)}
                          className={`group ml-2 flex w-[calc(100%-0.5rem)] items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition-all ${
                            selectedProjectId === sub.id
                              ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                              : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-500 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-300"
                          }`}
                        >
                          <FolderOpen
                            className={`h-3 w-3 flex-shrink-0 ${
                              selectedProjectId === sub.id ? "text-yellow-500" : "text-neutral-400"
                            }`}
                          />
                          <span className="truncate">{sub.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}

            {recentProjects.length === 0 && (
              <p className="px-2 text-xs text-neutral-400 italic">Nenhum projeto encontrado.</p>
            )}
          </ul>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (Detail) */}
      <div className="flex flex-1 flex-col overflow-y-auto bg-white p-3 sm:p-4 dark:bg-neutral-950">
        {selectedProjectId === "dashboard" ? (
          <ProjectsOverview />
        ) : (
          <ProjectsDashboard projectId={selectedProjectId} />
        )}
      </div>
    </div>
  );
}
