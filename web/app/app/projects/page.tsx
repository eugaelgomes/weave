"use client";

import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useProjects } from "../../contexts/ProjectsContext";
import ProjectsCarousel from "../components/ui/project-carousel";
import {
  Folder,
  Users,
  FileText,
  TrendingUp,
  CheckCircle2,
  Archive,
  Clock,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function ProjectsPage() {
  const { authenticated, loading: authLoading, user } = useAuth();
  const { getProjectsStats, getRecentProjects, loading: projectsLoading } = useProjects();
  const [showStats, setShowStats] = useState(false);

  if (authLoading || projectsLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
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

  const userCurrentDateTime = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const stats = getProjectsStats();
  const recentProjects = getRecentProjects();
  const userName = String(user?.user_name || user?.username || "usuário");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-950">
          <span className="sm:text-md text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
            Projetos de {userName}
          </span>
          <span className="text-sm text-neutral-600 lg:block dark:text-neutral-400">
            {userCurrentDateTime}
          </span>
        </div>

        {/* Estatísticas e Progresso */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
          {/* Coluna Esquerda - Estatísticas */}
          <div className="flex flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950">
            {/* Cabeçalho do Painel - Colapsável em mobile */}
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex w-full items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-600 uppercase dark:text-neutral-500">
                Estatísticas
              </h3>
              <span className="text-neutral-600 sm:hidden dark:text-neutral-500">
                {showStats ? "−" : "+"}
              </span>
            </button>

            {/* Lista de Métricas */}
            <div className={`${showStats ? "block" : "hidden"} flex-col sm:flex`}>
              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-950">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                    <Folder className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    Projetos
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-30 sm:block dark:border-neutral-800"></div>
                <span className="font-mono text-sm font-bold text-yellow-400">
                  {String(stats?.totalProjects ?? 0).padStart(2, "0")}
                </span>
              </div>

              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-400/20 bg-blue-400/10 text-blue-400">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    Notas indexadas
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-30 sm:block dark:border-neutral-800"></div>
                <span className="font-mono text-sm font-bold text-blue-400">
                  {String(stats?.totalNotes ?? 0).padStart(2, "0")}
                </span>
              </div>

              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-green-400/20 bg-green-400/10 text-green-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    Média de progresso
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-30 sm:block dark:border-neutral-800"></div>
                <span className="font-mono text-sm font-bold text-green-400">
                  {stats?.averageProgress ?? 0}%
                </span>
              </div>

              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-purple-400/20 bg-purple-400/10 text-purple-400">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                    Total de colaboradores
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-30 sm:block dark:border-neutral-800"></div>
                <span className="font-mono text-sm font-bold text-purple-400">
                  {String(stats?.totalCollaborators ?? 0).padStart(2, "0")}
                </span>
              </div>

              {/* Status Distribution - Seção Fixa */}
              <div className="border-t border-neutral-200 dark:border-neutral-800/50">
                <div className="bg-neutral-50 px-4 py-2 dark:bg-neutral-900/50">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-neutral-500 uppercase dark:text-neutral-600">
                    Status
                  </span>
                </div>

                {/* Aberto */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div>
                    <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-300">
                      Aberto
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-20 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-xs font-bold text-cyan-400">
                    {String(stats?.statusDistribution?.open ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Em Andamento */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                    <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-300">
                      Em Andamento
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-20 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {String(stats?.statusDistribution?.running ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Concluído */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                    <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-300">
                      Concluído
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-20 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-xs font-bold text-green-400">
                    {String(stats?.statusDistribution?.completed ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Pausado */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-400"></div>
                    <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-300">
                      Pausado
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-20 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-xs font-bold text-yellow-400">
                    {String(stats?.statusDistribution?.["on-hold"] ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Arquivado */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-neutral-500"></div>
                    <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-neutral-300">
                      Arquivado
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-300 opacity-20 sm:block dark:border-neutral-800"></div>
                  <span className="font-mono text-xs font-bold text-neutral-500">
                    {String(stats?.statusDistribution?.archived ?? 0).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Análise Detalhada */}
          <div className="flex flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/30">
              <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Análise Detalhada
              </h3>
            </div>

            <div className="relative p-5">
              {stats && stats.totalProjects > 0 ? (
                <div className="space-y-4">
                  {/* Grid de Status */}
                  <div>
                    <h4 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                      Por Status
                    </h4>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {/* Aberto */}
                      {(stats.statusDistribution?.open ?? 0) > 0 && (
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-100/50 p-3 transition-all hover:border-cyan-500/50 dark:border-neutral-800 dark:bg-neutral-900/50">
                          <div className="flex items-center gap-1.5">
                            <Folder className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
                            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                              Aberto
                            </span>
                          </div>
                          <span className="text-xl font-bold text-cyan-500 dark:text-cyan-400">
                            {stats.statusDistribution?.open ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-500 dark:text-neutral-600">
                            {stats.totalProjects > 0
                              ? Math.round(
                                  ((stats.statusDistribution?.open ?? 0) / stats.totalProjects) *
                                    100
                                )
                              : 0}
                            % total
                          </p>
                        </div>
                      )}

                      {/* Em Andamento */}
                      {(stats.statusDistribution?.running ?? 0) > 0 && (
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-100/50 p-3 transition-all hover:border-blue-500/50 dark:border-neutral-800 dark:bg-neutral-900/50">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                              Andamento
                            </span>
                          </div>
                          <span className="text-xl font-bold text-blue-500 dark:text-blue-400">
                            {stats.statusDistribution?.running ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-500 dark:text-neutral-600">
                            {stats.totalProjects > 0
                              ? Math.round(
                                  ((stats.statusDistribution?.running ?? 0) / stats.totalProjects) *
                                    100
                                )
                              : 0}
                            % total
                          </p>
                        </div>
                      )}

                      {/* Concluído */}
                      {(stats.statusDistribution?.completed ?? 0) > 0 && (
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-100/50 p-3 transition-all hover:border-green-500/50 dark:border-neutral-800 dark:bg-neutral-900/50">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                              Concluído
                            </span>
                          </div>
                          <span className="text-xl font-bold text-green-500 dark:text-green-400">
                            {stats.statusDistribution?.completed ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-500 dark:text-neutral-600">
                            {stats.totalProjects > 0
                              ? Math.round(
                                  ((stats.statusDistribution?.completed ?? 0) /
                                    stats.totalProjects) *
                                    100
                                )
                              : 0}
                            % total
                          </p>
                        </div>
                      )}

                      {/* Pausado */}
                      {(stats.statusDistribution?.["on-hold"] ?? 0) > 0 && (
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-100/50 p-3 transition-all hover:border-yellow-500/50 dark:border-neutral-800 dark:bg-neutral-900/50">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400" />
                            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                              Pausado
                            </span>
                          </div>
                          <span className="text-xl font-bold text-yellow-500 dark:text-yellow-400">
                            {stats.statusDistribution?.["on-hold"] ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-500 dark:text-neutral-600">
                            {stats.totalProjects > 0
                              ? Math.round(
                                  ((stats.statusDistribution?.["on-hold"] ?? 0) /
                                    stats.totalProjects) *
                                    100
                                )
                              : 0}
                            % total
                          </p>
                        </div>
                      )}

                      {/* Arquivado */}
                      {(stats.statusDistribution?.archived ?? 0) > 0 && (
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-200 bg-neutral-100/50 p-3 transition-all hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900/50 dark:hover:border-neutral-600">
                          <div className="flex items-center gap-1.5">
                            <Archive className="h-3.5 w-3.5 text-neutral-500" />
                            <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">
                              Arquivado
                            </span>
                          </div>
                          <span className="text-xl font-bold text-neutral-500 dark:text-neutral-400">
                            {stats.statusDistribution?.archived ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-500 dark:text-neutral-600">
                            {stats.totalProjects > 0
                              ? Math.round(
                                  ((stats.statusDistribution?.archived ?? 0) /
                                    stats.totalProjects) *
                                    100
                                )
                              : 0}
                            % total
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid de Prioridade e Complexidade */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Prioridade */}
                    {(stats.priorityDistribution.alta > 0 ||
                      stats.priorityDistribution.media > 0 ||
                      stats.priorityDistribution.baixa > 0) && (
                      <div className="rounded-md border border-neutral-200/50 bg-neutral-100/30 p-3 dark:border-neutral-800/50 dark:bg-neutral-900/30">
                        <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                          <AlertCircle className="h-3 w-3" />
                          Prioridade
                        </h4>
                        <div className="space-y-1.5">
                          {stats.priorityDistribution.alta > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500">Alta</span>
                              <span className="font-mono text-xs font-bold text-red-400">
                                {stats.priorityDistribution.alta}
                              </span>
                            </div>
                          )}
                          {stats.priorityDistribution.media > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500">Média</span>
                              <span className="font-mono text-xs font-bold text-yellow-400">
                                {stats.priorityDistribution.media}
                              </span>
                            </div>
                          )}
                          {stats.priorityDistribution.baixa > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500">Baixa</span>
                              <span className="font-mono text-xs font-bold text-blue-400">
                                {stats.priorityDistribution.baixa}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Complexidade */}
                    {(stats.complexityDistribution.alta > 0 ||
                      stats.complexityDistribution.media > 0 ||
                      stats.complexityDistribution.baixa > 0) && (
                      <div className="rounded-md border border-neutral-200/50 bg-neutral-100/30 p-3 dark:border-neutral-800/50 dark:bg-neutral-900/30">
                        <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                          <Zap className="h-3 w-3" />
                          Complexidade
                        </h4>
                        <div className="space-y-1.5">
                          {stats.complexityDistribution.alta > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-600 dark:text-neutral-500">Alta</span>
                              <span className="font-mono text-xs font-bold text-red-500 dark:text-red-400">
                                {stats.complexityDistribution.alta}
                              </span>
                            </div>
                          )}
                          {stats.complexityDistribution.media > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-600 dark:text-neutral-500">Média</span>
                              <span className="font-mono text-xs font-bold text-yellow-500 dark:text-yellow-400">
                                {stats.complexityDistribution.media}
                              </span>
                            </div>
                          )}
                          {stats.complexityDistribution.baixa > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-600 dark:text-neutral-500">Baixa</span>
                              <span className="font-mono text-xs font-bold text-green-500 dark:text-green-400">
                                {stats.complexityDistribution.baixa}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Destaques */}
                  {(stats.mostCollaborativeProject ||
                    stats.mostActiveProject ||
                    stats.projectsWithDeadline > 0) && (
                    <div className="rounded-md border border-neutral-200/50 bg-neutral-100/30 p-3 dark:border-neutral-800/50 dark:bg-neutral-900/30">
                      <h4 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                        Destaques
                      </h4>
                      <div className="space-y-2">
                        {stats.mostCollaborativeProject && (
                          <div className="flex items-start gap-2">
                            <Users className="mt-0.5 h-3 w-3 flex-shrink-0 text-purple-500 dark:text-purple-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-neutral-600 dark:text-neutral-500">Mais colaborativo</p>
                              <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-300">
                                {stats.mostCollaborativeProject.title}
                              </p>
                              <span className="text-[9px] text-purple-500 dark:text-purple-400">
                                {stats.mostCollaborativeProject.count} colaboradores
                              </span>
                            </div>
                          </div>
                        )}
                        {stats.mostActiveProject && (
                          <div className="flex items-start gap-2">
                            <FileText className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-neutral-600 dark:text-neutral-500">Mais ativo</p>
                              <p className="truncate text-xs font-medium text-neutral-800 dark:text-neutral-300">
                                {stats.mostActiveProject.title}
                              </p>
                              <span className="text-[9px] text-blue-500 dark:text-blue-400">
                                {stats.mostActiveProject.count} notas
                              </span>
                            </div>
                          </div>
                        )}
                        {stats.projectsWithDeadline > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 flex-shrink-0 text-yellow-500 dark:text-yellow-400" />
                            <div className="flex-1">
                              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                <span className="font-mono font-bold text-yellow-500 dark:text-yellow-400">
                                  {stats.projectsWithDeadline}
                                </span>{" "}
                                projeto{stats.projectsWithDeadline > 1 ? "s" : ""} com prazo
                                definido
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center">
                  <p className="font-mono text-sm text-neutral-500 dark:text-neutral-600">NO_DATA_FOUND</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projetos Recentes - Carrossel */}
        <ProjectsCarousel 
          projects={recentProjects} 
          title="Projetos Recentes"
          emptyMessage="Você ainda não tem projetos"
          emptyActionText="Criar Primeiro Projeto"
          emptyActionHref="/app/projects/new"
        />
      </div>
    </div>
  );
}
