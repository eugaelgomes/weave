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
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-2">
          <span className="sm:text-md text-base font-medium tracking-tight text-neutral-100">
            Projetos de {userName}
          </span>
          <span className="text-sm text-neutral-400 lg:block">{userCurrentDateTime}</span>
        </div>

        {/* Estatísticas e Progresso */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
          {/* Coluna Esquerda - Estatísticas */}
          <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            {/* Cabeçalho do Painel */}
            <div className="border-b border-neutral-800 bg-neutral-900/50 px-4 py-2.5">
              <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Estatísticas
              </h3>
            </div>

            {/* Lista de Métricas */}
            <div className="flex flex-col">
              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                    <Folder className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                    Total de Projetos
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-30 sm:block"></div>
                <span className="font-mono text-sm font-bold text-yellow-400">
                  {String(stats?.totalProjects ?? 0).padStart(2, "0")}
                </span>
              </div>

              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-400/20 bg-blue-400/10 text-blue-400">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                    Total de Notas
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-30 sm:block"></div>
                <span className="font-mono text-sm font-bold text-blue-400">
                  {String(stats?.totalNotes ?? 0).padStart(2, "0")}
                </span>
              </div>

              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-green-400/20 bg-green-400/10 text-green-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                    Progresso Médio
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-30 sm:block"></div>
                <span className="font-mono text-sm font-bold text-green-400">
                  {stats?.averageProgress ?? 0}%
                </span>
              </div>

              {/* Status Distribution - Seção Fixa */}
              <div className="border-t border-neutral-800/50">
                <div className="bg-neutral-900/50 px-4 py-2">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase">
                    Status
                  </span>
                </div>

                {/* Ativo */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Ativo
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {String(stats?.statusDistribution?.ativo ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Concluído */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Concluído
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-green-400">
                    {String(stats?.statusDistribution?.concluído ?? 0).padStart(2, "0")}
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
                    {String(stats?.statusDistribution?.arquivado ?? 0).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Distribuição de Status */}
          <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div className="border-b border-neutral-800 bg-neutral-900/30 px-4 py-2.5">
              <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Distribuição por Status
              </h3>
            </div>

            <div className="relative p-5">
              {stats && stats.totalProjects > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Card Ativo */}
                  <div className="group flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-blue-500/50 hover:bg-neutral-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/20">
                        <Folder className="h-4 w-4 text-blue-400" />
                      </div>
                      <span className="text-xs font-semibold tracking-wider text-neutral-300">
                        Ativos
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-blue-400">
                        {stats.statusDistribution?.ativo ?? 0}
                      </span>
                      <p className="mt-1 text-[10px] text-neutral-500">
                        {stats.totalProjects > 0
                          ? Math.round(
                              ((stats.statusDistribution?.ativo ?? 0) / stats.totalProjects) * 100
                            )
                          : 0}
                        % do total
                      </p>
                    </div>
                  </div>

                  {/* Card Concluído */}
                  <div className="group flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-green-500/50 hover:bg-neutral-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500/20">
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      </div>
                      <span className="text-xs font-semibold tracking-wider text-neutral-300">
                        Concluídos
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-green-400">
                        {stats.statusDistribution?.concluído ?? 0}
                      </span>
                      <p className="mt-1 text-[10px] text-neutral-500">
                        {stats.totalProjects > 0
                          ? Math.round(
                              ((stats.statusDistribution?.concluído ?? 0) / stats.totalProjects) *
                                100
                            )
                          : 0}
                        % do total
                      </p>
                    </div>
                  </div>

                  {/* Card Arquivado */}
                  <div className="group flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 p-4 transition-all hover:border-neutral-600 hover:bg-neutral-900">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-700/50">
                        <Archive className="h-4 w-4 text-neutral-400" />
                      </div>
                      <span className="text-xs font-semibold tracking-wider text-neutral-300">
                        Arquivados
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-neutral-400">
                        {stats.statusDistribution?.arquivado ?? 0}
                      </span>
                      <p className="mt-1 text-[10px] text-neutral-500">
                        {stats.totalProjects > 0
                          ? Math.round(
                              ((stats.statusDistribution?.arquivado ?? 0) / stats.totalProjects) *
                                100
                            )
                          : 0}
                        % do total
                      </p>
                    </div>
                  </div>
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
                    className="block w-[calc(100vw-3rem)] max-w-[280px] flex-shrink-0 snap-start sm:w-[300px] sm:max-w-[320px]"
                  >
                    <div
                      className="group flex h-[240px] flex-col rounded-md border border-neutral-800 p-3 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900 sm:h-[260px] sm:p-4"
                      style={{
                        backgroundColor: project.color ? `${project.color}15` : "rgb(10 10 10 / 1)",
                        borderColor: project.color ? `${project.color}40` : "",
                      }}
                    >
                      {/* Cabeçalho */}
                      <div className="mb-2 flex flex-shrink-0 items-start justify-between gap-2 sm:mb-3">
                        <div className="flex items-center gap-2">
                          {project.icon && <span className="text-2xl">{project.icon}</span>}
                          <div className="flex-1">
                            <h3 className="truncate text-sm leading-tight font-semibold text-white transition-colors group-hover:text-yellow-400 sm:text-base">
                              {project.title}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Descrição */}
                      <div className="mb-2 flex-1 sm:mb-3">
                        {project.description && (
                          <p className="line-clamp-3 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                            {project.description.length > 100
                              ? project.description.substring(0, 100) + "..."
                              : project.description}
                          </p>
                        )}
                      </div>

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
                            className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Rodapé */}
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span
                            className={`inline-block rounded-md px-2 py-1 text-[10px] font-bold uppercase sm:text-xs ${
                              project.status === "ativo"
                                ? "bg-blue-500/20 text-blue-400"
                                : project.status === "concluído"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-neutral-800 text-neutral-400"
                            }`}
                          >
                            {project.status}
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
