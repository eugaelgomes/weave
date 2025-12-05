"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useNotes } from "../../contexts/NotesContext";
import { checkHealth, type HealthStatus } from "../../services";
import { FileText, Tag, ChevronLeft, ChevronRight, GitBranch, Hash } from "lucide-react";

export default function HomePage() {
  const { authenticated, loading, user } = useAuth();
  const { getNotesStats, getRecentNotes } = useNotes();
  const [showMetrics, setShowMetrics] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [healthStatus, setHealthStatus] = React.useState<HealthStatus | null>(null);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  // Verificar health do servidor
  React.useEffect(() => {
    const fetchHealth = async () => {
      const status = await checkHealth();
      setHealthStatus(status);
    };

    fetchHealth();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
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

  const stats = getNotesStats();
  const recentNotes = getRecentNotes();
  const userName = String(user?.name || user?.username || "usuário");

  // Formatar uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Controle do carrossel
  const scrollToSlide = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.scrollWidth / recentNotes.length;
      carouselRef.current.scrollTo({
        left: cardWidth * index,
        behavior: "smooth",
      });
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    if (currentSlide < recentNotes.length - 1) {
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
        <div className="flex flex-col gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-medium tracking-tight text-neutral-100 sm:text-lg">
              Olá, {userName} {"ツ"}
            </span>
            {/* Health Status - Mobile */}
            <div className="flex items-center gap-2 md:hidden">
              {healthStatus ? (
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-2 w-2 rounded-full ${healthStatus.status === "online" ? "animate-pulse bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <span className="font-mono text-[9px] text-neutral-500 uppercase">
                    {healthStatus.status}
                  </span>
                </div>
              ) : (
                <span className="font-mono text-[9px] text-neutral-600">...</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-neutral-400 sm:gap-4 sm:text-sm">
            <span className="truncate">{userCurrentDateTime}</span>

            {/* Health Status - Desktop */}
            <div className="hidden items-center gap-2 md:flex">
              {healthStatus ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`h-2 w-2 rounded-full ${healthStatus.status === "online" ? "animate-pulse bg-green-500" : "bg-red-500"}`}
                    ></div>
                    <span className="font-mono text-[10px] text-neutral-500 uppercase">
                      {healthStatus.status}
                    </span>
                  </div>
                  {healthStatus.status === "online" && (
                    <span className="font-mono text-xs text-neutral-600">
                      ↑ {formatUptime(healthStatus.uptime)}
                    </span>
                  )}
                </>
              ) : (
                <span className="font-mono text-[10px] text-neutral-600">CHECKING...</span>
              )}
            </div>
          </div>
        </div>

{/* Estatísticas e Mapa Mental */}
<div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[260px_1fr]">

  {/* === CARD 1 — MÉTRICAS === */}
  <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">

    {/* Cabeçalho + Toggle */}
    <button
      onClick={() => setShowMetrics(!showMetrics)}
      className="flex w-full items-center justify-between border-b border-neutral-800 bg-neutral-900/50 px-3 py-2 sm:px-4"
    >
      <h3 className="font-mono text-[9px] font-bold tracking-widest text-neutral-500 uppercase sm:text-[10px]">
        Métricas
      </h3>

      {/* Toggle só no mobile */}
      <span className="text-neutral-500 sm:hidden">
        {showMetrics ? "−" : "+"}
      </span>
    </button>

    {/* Conteúdo — mobile: toggle / desktop: sempre aberto */}
    <div className={`${showMetrics ? "block" : "hidden"} sm:block`}>

      {/* Lista de Métricas */}
      <div className="flex flex-col">

        <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-800 sm:gap-3 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
              Total de Notas
            </span>
          </div>
          <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-30 lg:block"></div>
          <span className="font-mono text-sm font-bold text-yellow-400">
            {String(stats?.totalNotes ?? 0).padStart(2, "0")}
          </span>
        </div>

        <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-800 sm:gap-3 sm:py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-blue-400/20 bg-blue-400/10 text-blue-400">
              <Tag className="h-3.5 w-3.5" />
            </div>
            <span className="text-[11px] font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
              Tags únicas
            </span>
          </div>
          <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-30 lg:block"></div>
          <span className="font-mono text-sm font-bold text-blue-400">
            {String(stats?.totalTags ?? 0).padStart(2, "0")}
          </span>
        </div>

        {/* Status Distribution */}
        <div className="border-t border-neutral-800/50">
          <div className="bg-neutral-900/50 px-3 py-1.5 sm:px-4">
            <span className="font-mono text-[8px] font-bold tracking-widest text-neutral-600 uppercase sm:text-[9px]">
              Status
            </span>
          </div>

          {/* Open */}
          <div className="group flex items-center justify-between gap-2 px-3 py-1.5 transition-colors hover:bg-neutral-800">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400"></div>
              <span className="text-[10px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                Aberto
              </span>
            </div>
            <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 lg:block"></div>
            <span className="font-mono text-[11px] font-bold text-blue-400">
              {String(stats?.statusDistribution?.open ?? 0).padStart(2, "0")}
            </span>
          </div>

          {/* Done */}
          <div className="group flex items-center justify-between gap-2 px-3 py-1.5 transition-colors hover:bg-neutral-800">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400"></div>
              <span className="text-[10px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                Feito
              </span>
            </div>
            <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 lg:block"></div>
            <span className="font-mono text-[11px] font-bold text-green-400">
              {String(stats?.statusDistribution?.done ?? 0).padStart(2, "0")}
            </span>
          </div>

          {/* Closed */}
          <div className="group flex items-center justify-between gap-2 px-3 py-1.5 transition-colors hover:bg-neutral-800">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400"></div>
              <span className="text-[10px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                Fechado
              </span>
            </div>
            <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 lg:block"></div>
            <span className="font-mono text-[11px] font-bold text-red-400">
              {String(stats?.statusDistribution?.closed ?? 0).padStart(2, "0")}
            </span>
          </div>

          {/* No Status */}
          <div className="group flex items-center justify-between gap-2 px-3 py-1.5 transition-colors hover:bg-neutral-800">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neutral-500"></div>
              <span className="text-[10px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                Sem Status
              </span>
            </div>
            <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 lg:block"></div>
            <span className="font-mono text-[11px] font-bold text-neutral-500">
              {String(stats?.statusDistribution?.sem_status ?? 0).padStart(2, "0")}
            </span>
          </div>

        </div>
      </div>
    </div>
  </div>

  {/* === CARD 2 — TAGS MAIS USADAS === */}
  <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">

    {/* Cabeçalho + Toggle */}
    <button
      onClick={() => setShowTags(!showTags)}
      className="flex w-full items-center justify-between border-b border-neutral-800 bg-neutral-900/30 px-3 py-2 sm:px-4"
    >
      <h3 className="font-mono text-[9px] font-bold tracking-widest text-neutral-500 uppercase sm:text-[10px]">
        Tags mais usadas
      </h3>

      <span className="text-neutral-500 sm:hidden">
        {showTags ? "−" : "+"}
      </span>
    </button>

    {/* Conteúdo — toggle no mobile, sempre aberto no desktop */}
    <div className={`${showTags ? "block" : "hidden"} sm:block`}>
      <div className="relative p-3">

        {stats?.mostUsedTags && stats.mostUsedTags.length > 0 ? (
          <div className="flex flex-col">

            {/* Nó Principal */}
            <div className="relative z-10 mb-5 flex w-fit items-center gap-2 border-l-2 border-yellow-500 bg-neutral-900 py-1.5 pr-3 pl-2.5 sm:mb-6">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-yellow-400">
                <Tag className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-neutral-200 sm:text-sm">Tag Maps</h3>
                <p className="font-mono text-[9px] text-neutral-500">
                  {user?.username || "root"}
                </p>
              </div>

              <div className="absolute -bottom-5 left-[18px] h-5 w-px bg-neutral-700 sm:-bottom-6 sm:h-6"></div>
            </div>

            {/* Grid */}
            <div className="relative grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">

              <div className="absolute top-[-10px] left-[18px] hidden h-px w-[calc(100%-36px)] bg-neutral-700 opacity-50 sm:top-[-12px] sm:block"></div>

              {stats.mostUsedTags.slice(0, 6).map((tagInfo, i) => (
                <div
                  key={i}
                  className="group relative flex flex-col gap-1.5 rounded-md border border-neutral-800 bg-neutral-900/50 p-2 transition-colors hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <div className="absolute -top-2.5 left-[14px] h-2.5 w-px bg-neutral-700 opacity-50 transition-colors group-hover:bg-yellow-500/50 sm:-top-3 sm:h-3"></div>
                  <div className="absolute -top-[1px] left-[12.5px] h-1.5 w-1.5 bg-neutral-600 transition-colors group-hover:bg-yellow-500"></div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5 text-neutral-300">
                      <Hash className="h-3 w-3 flex-shrink-0 text-neutral-500 transition-colors group-hover:text-yellow-400" />
                      <span className="truncate text-[11px] font-semibold tracking-wider">
                        {tagInfo.tag}
                      </span>
                    </div>
                    <div className="flex-shrink-0 rounded-md border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 font-mono text-[9px] text-neutral-400">
                      {tagInfo.count}
                    </div>
                  </div>
                </div>
              ))}

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

</div>


        {/* Notas Recentes - Carrossel */}
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
            <h3 className="text-base font-semibold text-neutral-100 sm:text-lg">Notas Recentes</h3>
            {recentNotes.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="rounded-md bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={currentSlide === recentNotes.length - 1}
                  className="rounded-md bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Próxima"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {recentNotes.length === 0 ? (
            <div className="py-8 text-center text-neutral-400">
              <FileText className="mx-auto mb-2 h-10 w-10 text-neutral-600" />
              <p className="mb-1 text-base font-medium text-neutral-200">
                Você ainda não tem notas
              </p>
              <p className="mb-4 text-sm text-neutral-500">Que tal criar sua primeira nota?</p>
              <Link
                href="/app/notes"
                className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
              >
                <FileText className="h-4 w-4" />
                Criar Primeira Nota
              </Link>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={carouselRef}
                className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth sm:gap-3"
              >
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/app/notes/view/${note.id}`}
                    className="block w-[calc(100vw-2.5rem)] max-w-[300px] flex-shrink-0 snap-start sm:w-[280px] sm:max-w-[300px] md:w-[320px]"
                  >
                    <div className="group flex h-[260px] flex-col rounded-md border border-neutral-800 bg-neutral-950 p-3 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900 sm:h-[280px] sm:p-4">
                      {/* Cabeçalho: data + tags */}
                      <div className="mb-2 flex flex-shrink-0 flex-col gap-2 sm:mb-3">
                        {/* Título */}
                        <h3 className="line-clamp-2 flex-shrink-0 text-base font-semibold leading-tight text-white transition-colors group-hover:text-yellow-400 sm:text-lg">
                          {note.title || "Nota sem título"}
                        </h3>

                        {/* Data */}
                        {note.lastModified && (
                          <span className="text-[11px] font-medium text-neutral-500 sm:text-xs">
                            {new Date(note.lastModified).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}

                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {note.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="truncate rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2.5 py-0.5 text-[10px] font-medium text-yellow-400 sm:py-1"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 3 && (
                              <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-500 sm:py-1">
                                +{note.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Descrição - ocupa espaço flexível */}
                      <div className="mb-3 flex-1 overflow-hidden">
                        {note.preview && (
                          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-400 sm:line-clamp-4">
                            {note.preview.length > 150
                              ? note.preview.substring(0, 150) + "..."
                              : note.preview}
                          </p>
                        )}
                      </div>

                      {/* Rodapé: status e colaboradores */}
                      <div className="mt-auto flex flex-shrink-0 items-center justify-between gap-2 border-t border-neutral-800/50 pt-3">
                        <div className="flex-shrink-0">
                          {note.status ? (
                            <span
                              className={`inline-block rounded-md px-2.5 py-1 text-[10px] font-bold uppercase ${
                                note.status === "open"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : note.status === "done"
                                    ? "bg-green-500/20 text-green-400"
                                    : note.status === "closed"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-neutral-800 text-neutral-400"
                              }`}
                            >
                              {note.status}
                            </span>
                          ) : (
                            <span className="inline-block rounded-md bg-neutral-800 px-2.5 py-1 text-[10px] font-bold uppercase text-neutral-500">
                              sem status
                            </span>
                          )}
                        </div>

                        {/* Collaborators */}
                        {note.collaboratorsCount > 0 && (
                          <div className="flex flex-shrink-0 items-center gap-1.5">
                            <GitBranch className="h-4 w-4 text-neutral-500" />
                            <span className="text-xs font-medium text-neutral-400">
                              {note.collaboratorsCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Indicadores de slides */}
              {recentNotes.length > 1 && (
                <div className="mt-4 flex justify-center gap-2">
                  {recentNotes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        currentSlide === index
                          ? "w-8 bg-yellow-500"
                          : "w-2 bg-neutral-700 hover:bg-neutral-600"
                      }`}
                      aria-label={`Ir para nota ${index + 1}`}
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
