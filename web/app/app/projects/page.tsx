"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useProjects } from "../../contexts/ProjectsContext";
import {
  Folder,
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  TrendingUp,
  CheckCircle2,
  Archive,
  Clock,
  Tag,
  AlertCircle,
  Zap,
} from "lucide-react";

export default function ProjectsPage() {
  const { authenticated, loading: authLoading, user } = useAuth();
  const { getProjectsStats, getRecentProjects, loading: projectsLoading } = useProjects();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);

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
  const userName = String(user?.name || user?.username || "usuário");

  // Controle do carrossel
  const scrollToSlide = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.scrollWidth / recentProjects.length;
      carouselRef.current.scrollTo({
        left: cardWidth * index,
        behavior: "smooth",
      });
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    if (currentSlide < recentProjects.length - 1) {
      scrollToSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      scrollToSlide(currentSlide - 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 rounded-md border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-900">
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
          <div className="flex flex-col rounded-md border border-neutral-200 bg-white backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/50">
            {/* Cabeçalho do Painel */}
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
              <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-600 uppercase dark:text-neutral-500">
                Estatísticas
              </h3>
            </div>

            {/* Lista de Métricas */}
            <div className="flex flex-col">
              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800">
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
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Concluído
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-green-400">
                    {String(stats?.statusDistribution?.completed ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Pausado */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-400"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Pausado
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-yellow-400">
                    {String(stats?.statusDistribution?.["on-hold"] ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Arquivado */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-neutral-500"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Arquivado
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-neutral-500">
                    {String(stats?.statusDistribution?.archived ?? 0).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Análise Detalhada */}
          <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="border-b border-neutral-800 bg-neutral-900/30 px-4 py-2.5">
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
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-cyan-500/50">
                          <div className="flex items-center gap-1.5">
                            <Folder className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-[10px] font-semibold text-neutral-400">
                              Aberto
                            </span>
                          </div>
                          <span className="text-xl font-bold text-cyan-400">
                            {stats.statusDistribution?.open ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-600">
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
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-blue-500/50">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-[10px] font-semibold text-neutral-400">
                              Andamento
                            </span>
                          </div>
                          <span className="text-xl font-bold text-blue-400">
                            {stats.statusDistribution?.running ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-600">
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
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-green-500/50">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                            <span className="text-[10px] font-semibold text-neutral-400">
                              Concluído
                            </span>
                          </div>
                          <span className="text-xl font-bold text-green-400">
                            {stats.statusDistribution?.completed ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-600">
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
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-yellow-500/50">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-yellow-400" />
                            <span className="text-[10px] font-semibold text-neutral-400">
                              Pausado
                            </span>
                          </div>
                          <span className="text-xl font-bold text-yellow-400">
                            {stats.statusDistribution?.["on-hold"] ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-600">
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
                        <div className="group flex flex-col gap-1 rounded-md border border-neutral-800 bg-neutral-900/50 p-3 transition-all hover:border-neutral-600">
                          <div className="flex items-center gap-1.5">
                            <Archive className="h-3.5 w-3.5 text-neutral-500" />
                            <span className="text-[10px] font-semibold text-neutral-400">
                              Arquivado
                            </span>
                          </div>
                          <span className="text-xl font-bold text-neutral-400">
                            {stats.statusDistribution?.archived ?? 0}
                          </span>
                          <p className="text-[9px] text-neutral-600">
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
                      <div className="rounded-md border border-neutral-800/50 bg-neutral-900/30 p-3">
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
                      <div className="rounded-md border border-neutral-800/50 bg-neutral-900/30 p-3">
                        <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                          <Zap className="h-3 w-3" />
                          Complexidade
                        </h4>
                        <div className="space-y-1.5">
                          {stats.complexityDistribution.alta > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500">Alta</span>
                              <span className="font-mono text-xs font-bold text-red-400">
                                {stats.complexityDistribution.alta}
                              </span>
                            </div>
                          )}
                          {stats.complexityDistribution.media > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500">Média</span>
                              <span className="font-mono text-xs font-bold text-yellow-400">
                                {stats.complexityDistribution.media}
                              </span>
                            </div>
                          )}
                          {stats.complexityDistribution.baixa > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-neutral-500">Baixa</span>
                              <span className="font-mono text-xs font-bold text-green-400">
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
                    <div className="rounded-md border border-neutral-800/50 bg-neutral-900/30 p-3">
                      <h4 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-600 uppercase">
                        Destaques
                      </h4>
                      <div className="space-y-2">
                        {stats.mostCollaborativeProject && (
                          <div className="flex items-start gap-2">
                            <Users className="mt-0.5 h-3 w-3 flex-shrink-0 text-purple-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-neutral-500">Mais colaborativo</p>
                              <p className="truncate text-xs font-medium text-neutral-300">
                                {stats.mostCollaborativeProject.title}
                              </p>
                              <span className="text-[9px] text-purple-400">
                                {stats.mostCollaborativeProject.count} colaboradores
                              </span>
                            </div>
                          </div>
                        )}
                        {stats.mostActiveProject && (
                          <div className="flex items-start gap-2">
                            <FileText className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] text-neutral-500">Mais ativo</p>
                              <p className="truncate text-xs font-medium text-neutral-300">
                                {stats.mostActiveProject.title}
                              </p>
                              <span className="text-[9px] text-blue-400">
                                {stats.mostActiveProject.count} notas
                              </span>
                            </div>
                          </div>
                        )}
                        {stats.projectsWithDeadline > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 flex-shrink-0 text-yellow-400" />
                            <div className="flex-1">
                              <p className="text-xs text-neutral-400">
                                <span className="font-mono font-bold text-yellow-400">
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
                  <p className="font-mono text-sm text-neutral-600">NO_DATA_FOUND</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Projetos Recentes - Carrossel */}
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h3 className="text-sm font-semibold text-neutral-100 sm:text-base">
              Projetos Recentes
            </h3>
            {recentProjects.length > 1 && (
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="rounded-md bg-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 sm:p-2"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={currentSlide === recentProjects.length - 1}
                  className="rounded-md bg-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 sm:p-2"
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-4 w-4 sm:h-4 sm:w-4" />
                </button>
              </div>
            )}
          </div>

          {recentProjects.length === 0 ? (
            <div className="py-8 text-center text-neutral-400">
              <Folder className="mx-auto mb-2 h-10 w-10 text-neutral-600" />
              <p className="mb-1 text-base font-medium text-neutral-200">
                Você ainda não tem projetos
              </p>
              <p className="mb-4 text-sm text-neutral-500">Que tal criar seu primeiro projeto?</p>
              <button className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600">
                <Folder className="h-4 w-4" />
                Criar Primeiro Projeto
              </button>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={carouselRef}
                className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth sm:gap-3"
              >
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/projects/view/${project.id}`}
                    className="block w-[calc(100vw-3rem)] max-w-[280px] flex-shrink-0 snap-start sm:w-[320px] sm:max-w-[340px]"
                  >
                    <div
                      className="group flex h-[260px] flex-col rounded-md border border-neutral-800 p-3 transition-all duration-200 hover:border-neutral-700 hover:shadow-lg hover:shadow-neutral-900/50 sm:h-[260px] sm:p-4"
                      style={{
                        backgroundColor: project.color ? `${project.color}15` : "rgb(10 10 10 / 1)",
                        borderColor: project.color ? `${project.color}40` : "",
                      }}
                    >
                      {/* Cabeçalho com ícone e prioridade */}
                      <div className="mb-2 flex flex-shrink-0 items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {project.icon && (
                            <span className="flex-shrink-0 text-2xl">{project.icon}</span>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm leading-tight font-semibold text-white transition-colors group-hover:text-yellow-400 sm:text-base">
                              {project.title}
                            </h3>
                          </div>
                        </div>
                        {project.priority && (
                          <div
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${
                              project.priority === "alta"
                                ? "bg-red-500/20 text-red-400"
                                : project.priority === "media"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-blue-500/20 text-blue-400"
                            }`}
                            title={`Prioridade: ${project.priority}`}
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Descrição */}
                      <div className="mb-2 min-h-0 flex-1 sm:mb-3">
                        {project.description && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                            {project.description}
                          </p>
                        )}
                      </div>

                      {/* Tags */}
                      {project.tags && project.tags.length > 0 && (
                        <div className="mb-2 flex flex-shrink-0 flex-wrap gap-1">
                          <span className="text-sm text-neutral-500">Tags:</span>
                          {project.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md bg-neutral-800/70 px-2 py-0.5 text-[10px] font-medium text-neutral-300"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 3 && (
                            <span className="inline-flex items-center rounded-md bg-neutral-800/70 px-2 py-0.5 text-[10px] font-medium text-neutral-400">
                              +{project.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Metadata Row: Complexidade e Tempo Estimado */}
                      {(project.complexity || project.estimatedTime) && (
                        <div className="mb-2 flex w-full items-center justify-between">
                          {/* Complexidade — Esquerda */}
                          {project.complexity && (
                            <div className="flex items-center gap-1">
                              <Zap
                                className={`h-3 w-3 ${
                                  project.complexity === "alta"
                                    ? "text-red-400"
                                    : project.complexity === "media"
                                      ? "text-yellow-400"
                                      : "text-green-400"
                                }`}
                              />
                              <span className="text-[10px] font-medium text-neutral-500">
                                Complexidade {project.complexity}
                              </span>
                            </div>
                          )}

                          {/* Prazo — Direita */}
                          {project.estimatedTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-neutral-500" />
                              <span className="text-[10px] font-medium text-neutral-500">
                                Para:
                                {new Date(project.estimatedTime).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Progresso */}
                      <div className="mb-2 flex-shrink-0 sm:mb-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-neutral-500 sm:text-xs">
                            Progresso
                          </span>
                          <span className="text-[10px] font-bold text-neutral-400 sm:text-xs">
                            {project.progress}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${project.progress}%`,
                              background: project.color
                                ? `linear-gradient(to right, ${project.color}, ${project.color}dd)`
                                : "linear-gradient(to right, #eab308, #facc15)",
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Rodapé com Status e Contadores */}
                      <div className="flex flex-shrink-0 items-center justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block rounded-md py-1 font-bold sm:text-xs ${
                              project.status === "open"
                                ? "text-cyan-400"
                                : project.status === "running"
                                  ? "text-blue-400"
                                  : project.status === "completed"
                                    ? "bg-green-500/20 text-green-400"
                                    : project.status === "on-hold"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : project.status === "archived"
                                        ? "bg-neutral-700/20 text-neutral-400"
                                        : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {project.status === "open"
                              ? "Em aberto"
                              : project.status === "running"
                                ? "Em andamento"
                                : project.status === "completed"
                                  ? "Concluído"
                                  : project.status === "on-hold"
                                    ? "Pausado"
                                    : project.status === "archived"
                                      ? "Arquivado"
                                      : project.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Colaboradores */}
                          {project.collaboratorsCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-neutral-500" />
                              <span className="text-[10px] font-medium text-neutral-400 sm:text-xs">
                                {project.collaboratorsCount}
                              </span>
                            </div>
                          )}

                          {/* Notas */}
                          {project.notesCount > 0 && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5 text-neutral-500" />
                              <span className="text-[10px] font-medium text-neutral-400 sm:text-xs">
                                {project.notesCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Indicadores de slides */}
              {recentProjects.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5 sm:mt-4 sm:gap-2">
                  {recentProjects.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        currentSlide === index
                          ? "w-8 bg-yellow-500"
                          : "w-2 bg-neutral-700 hover:bg-neutral-600"
                      }`}
                      aria-label={`Ir para projeto ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
