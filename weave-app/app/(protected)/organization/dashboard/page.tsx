"use client";

import React, { useState } from "react";
import Link from "next/link";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";
import { useProjects } from "@/app/_contexts/projects-context";
import { Project } from "@/app/_services/projects-service/projects-service";
import { Layers, Search, Plus, Folder, Clock, Flag, Activity, ArrowRight } from "lucide-react";
import { PROJECT_STATUS } from "@/app/_utils/db-enums";

// Reaproveitando seus dicionários de status para consistência visual em todo o SaaS
const statusLabels: Record<string, string> = {
  [PROJECT_STATUS.OPEN]: "Aberto",
  [PROJECT_STATUS.IN_PROGRESS]: "Em Andamento",
  [PROJECT_STATUS.PAUSED]: "Pausado",
  [PROJECT_STATUS.COMPLETED]: "Concluído",
  [PROJECT_STATUS.ARCHIVED]: "Arquivado",
};

const statusColors: Record<string, string> = {
  [PROJECT_STATUS.OPEN]: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  [PROJECT_STATUS.IN_PROGRESS]: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  [PROJECT_STATUS.PAUSED]: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  [PROJECT_STATUS.COMPLETED]: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  [PROJECT_STATUS.ARCHIVED]: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
};

const priorityLabels: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const ProjectsPage = () => {
  // Assumindo que o seu useProjects expõe a lista de projetos e o estado de loading
  const { projects = [], loading: isLoading } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");

  // Lógica de filtragem no client-side (ideal para dezenas/centenas de projetos)
  // Caso a aplicação escale para milhares, considere server-side filtering
  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in flex h-full flex-col duration-300">
      <WorkspaceHeader />

      {/* Page Header */}
      <div className="border-b border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-brand-primary-500/10 rounded-lg p-2">
              <Layers className="text-brand-primary-500 h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Projetos da Organização
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Gerencie e acompanhe o portfólio de projetos compartilhados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar projetos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full rounded-md border border-neutral-300 bg-white pr-4 pl-9 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none sm:w-64 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </div>
            <button className="bg-brand-primary-500 flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-colors hover:bg-yellow-600 focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-neutral-950">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Projeto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-white p-6 dark:bg-neutral-950">
        <div className="mx-auto max-w-7xl">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-500" />
            </div>
          ) : filteredProjects.length === 0 ? (
            /* Empty State */
            <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center dark:border-neutral-800 dark:bg-neutral-900/50">
              <Folder className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
              <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {searchTerm ? "Nenhum projeto encontrado" : "Nenhum projeto criado"}
              </h2>
              <p className="mb-6 text-neutral-600 dark:text-neutral-400">
                {searchTerm
                  ? "Tente ajustar os termos da sua busca."
                  : "Crie o primeiro projeto da sua organização para começar a colaborar."}
              </p>
              {!searchTerm && (
                <button className="bg-brand-primary-500 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-600">
                  <Plus className="h-4 w-4" />
                  Criar Primeiro Projeto
                </button>
              )}
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProjects.map((project) => (
                <Link
                  href={`/projects/${project.id}`}
                  key={project.id}
                  className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-yellow-500 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-yellow-500"
                >
                  <div>
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: project.properties?.color || "#3f51b5" }}
                      >
                        <Folder className="h-5 w-5" />
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase ${statusColors[project.status] || statusColors[PROJECT_STATUS.OPEN]}`}
                      >
                        {statusLabels[project.status] || project.status}
                      </span>
                    </div>

                    <h3 className="dark:group-hover:text-brand-primary-500 mb-2 line-clamp-1 text-base font-bold text-neutral-900 transition-colors group-hover:text-yellow-600 dark:text-neutral-100">
                      {project.title}
                    </h3>

                    <p className="mb-4 line-clamp-2 h-10 text-sm text-neutral-500 dark:text-neutral-400">
                      {project.description || "Nenhuma descrição fornecida para este projeto."}
                    </p>

                    <div className="mb-4 grid grid-cols-2 gap-2">
                      {project.methodology && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <Activity className="h-3.5 w-3.5" />
                          <span className="truncate capitalize">{project.methodology}</span>
                        </div>
                      )}
                      {project.properties?.priority && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <Flag className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {priorityLabels[project.properties.priority] ||
                              project.properties.priority}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
                    <div className="flex -space-x-2">
                      {/* Avatar placeholder - idealmente viria dos membros do projeto */}
                      <div className="h-7 w-7 rounded-full border-2 border-white bg-neutral-200 dark:border-neutral-900 dark:bg-neutral-700" />
                      <div className="h-7 w-7 rounded-full border-2 border-white bg-neutral-300 dark:border-neutral-900 dark:bg-neutral-600" />
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-[10px] font-medium text-neutral-600 dark:border-neutral-900 dark:bg-neutral-800 dark:text-neutral-300">
                        +3
                      </div>
                    </div>

                    <div className="dark:text-brand-primary-500 flex items-center gap-1 text-sm font-medium text-yellow-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Acessar <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
