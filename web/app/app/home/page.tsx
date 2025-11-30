"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useNotes } from "../../contexts/NotesContext";
import { checkHealth, type HealthStatus } from "../../services";
import { FileText, Tag, ChevronLeft, ChevronRight, GitBranch, Hash } from "lucide-react";

export default function HomePage() {
  const { authenticated, loading, user } = useAuth();
  const { getNotesStats, getRecentNotes } = useNotes();
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
        <div className="flex items-start justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-2">
          <span className="sm:text-md text-base font-medium tracking-tight text-neutral-100">
            Olá, {userName} {"ツ"}
          </span>
          <span className="text-sm text-neutral-400 lg:block">{userCurrentDateTime}</span>

          {/* Health Status */}
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

        {/* Estatísticas e Mapa Mental */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
          {/* Coluna Esquerda - Estatísticas Compactas (HUD Style) */}
          <div className="flex flex-col rounded-sm border border-neutral-800 bg-neutral-900/30 backdrop-blur-sm">
            {/* Cabeçalho do Painel */}
            <div className="border-b border-neutral-800 bg-neutral-900/50 px-4 py-2.5">
              <h3 className="font-mono text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
                Métricas
              </h3>
            </div>

            {/* Lista de Métricas */}
            <div className="flex flex-col">
              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-900/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                    Total de Notas
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-30 sm:block"></div>
                <span className="font-mono text-sm font-bold text-yellow-400">
                  {String(stats?.totalNotes ?? 0).padStart(2, "0")}
                </span>
              </div>

              <div className="group flex items-center justify-between px-4 py-3 transition-colors hover:bg-neutral-900/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm border border-blue-400/20 bg-blue-400/10 text-blue-400">
                    <Tag className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                    Tags únicas
                  </span>
                </div>
                <div className="mx-3 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-30 sm:block"></div>
                <span className="font-mono text-sm font-bold text-blue-400">
                  {String(stats?.totalTags ?? 0).padStart(2, "0")}
                </span>
              </div>

              {/* Status Distribution - Seção Fixa */}
              <div className="border-t border-neutral-800/50">
                <div className="bg-neutral-900/50 px-4 py-2">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase">
                    Status
                  </span>
                </div>

                {/* Open */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-900/80">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Aberto
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {String(stats?.statusDistribution?.open ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Done */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-900/80">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Feito
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-green-400">
                    {String(stats?.statusDistribution?.done ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* Closed */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-900/80">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-400"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Fechado
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-red-400">
                    {String(stats?.statusDistribution?.closed ?? 0).padStart(2, "0")}
                  </span>
                </div>

                {/* No Status */}
                <div className="group flex items-center justify-between px-4 py-2 transition-colors hover:bg-neutral-900/80">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-neutral-500"></div>
                    <span className="text-[11px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-300">
                      Sem Status
                    </span>
                  </div>
                  <div className="mx-2 hidden h-px flex-1 border-b border-dashed border-neutral-800 opacity-20 sm:block"></div>
                  <span className="font-mono text-xs font-bold text-neutral-500">
                    {String(stats?.statusDistribution?.sem_status ?? 0).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Mapa Mental Quadrado/Circuito */}
          {stats?.mostUsedTags && stats.mostUsedTags.length > 0 ? (
            <div className="relative flex flex-col rounded-sm border border-neutral-800 bg-neutral-900/30 p-5 backdrop-blur-sm">
              {/* Nó Principal (Raiz) */}
              <div className="relative z-10 mb-8 flex w-fit items-center gap-3 border-l-2 border-yellow-500 bg-neutral-900 py-1 pr-4 pl-4">
                <div className="flex h-8 w-8 items-center justify-center text-yellow-400">
                  <GitBranch className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-200">Mapa de Tags</h3>
                  <p className="font-mono text-[10px] text-neutral-500">
                    {user?.username || "root"}
                  </p>
                </div>

                {/* Linha vertical saindo do pai */}
                <div className="absolute -bottom-8 left-[24px] h-8 w-px bg-neutral-700"></div>
              </div>

              {/* Grid de Tags Filhas */}
              <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Linha Horizontal Mestra (Bus) */}
                <div className="absolute top-[-16px] left-[24px] hidden h-px w-[calc(100%-48px)] bg-neutral-700 opacity-50 sm:block"></div>

                {stats.mostUsedTags.slice(0, 6).map((tagInfo, i) => (
                  <div
                    key={i}
                    className="group relative flex flex-col gap-2 rounded-sm border border-neutral-800 bg-neutral-900/50 p-3 transition-colors hover:border-neutral-600 hover:bg-neutral-900"
                  >
                    {/* Conector Vertical (Entrando no card) */}
                    <div className="absolute -top-4 left-[20px] h-4 w-px bg-neutral-700 opacity-50 transition-colors group-hover:bg-yellow-500/50"></div>

                    {/* Ponto de solda */}
                    <div className="absolute -top-[1px] left-[18px] h-1.5 w-1.5 bg-neutral-600 transition-colors group-hover:bg-yellow-500"></div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-300">
                        <Hash className="h-3.5 w-3.5 text-neutral-500 transition-colors group-hover:text-yellow-400" />
                        <span className="text-xs font-semibold tracking-wider uppercase">
                          {tagInfo.tag}
                        </span>
                      </div>
                      {/* Badge de contagem com design mais técnico */}
                      <div className="rounded-sm border border-neutral-800 bg-neutral-900 px-2 py-0.5 font-mono text-[10px] text-neutral-400">
                        {tagInfo.count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Fallback
            <div className="flex items-center justify-center rounded-sm border border-neutral-800 bg-neutral-900/30 p-5">
              <p className="font-mono text-sm text-neutral-500">NO_DATA_FOUND</p>
            </div>
          )}
        </div>

        {/* Notas Recentes - Carrossel */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <h3 className="text-sm font-semibold text-neutral-100 sm:text-base">Notas Recentes</h3>
            {recentNotes.length > 1 && (
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="rounded-lg bg-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 sm:p-2"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={currentSlide === recentNotes.length - 1}
                  className="rounded-lg bg-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30 sm:p-2"
                  aria-label="Próxima"
                >
                  <ChevronRight className="h-4 w-4 sm:h-4 sm:w-4" />
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
                    className="block w-[calc(100vw-3rem)] max-w-[280px] flex-shrink-0 snap-start sm:w-[300px] sm:max-w-[320px]"
                  >
                    <div className="group flex h-[240px] flex-col rounded-xl border border-neutral-800 bg-neutral-950 p-3 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900 sm:h-[260px] sm:p-4">
                      {/* Cabeçalho: data + tags */}
                      <div className="mb-2 flex flex-shrink-0 flex-col gap-1.5 sm:mb-3 sm:gap-2">
                        {/* Data */}
                        {note.lastModified && (
                          <span className="text-xs font-medium text-neutral-500">
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
                            {note.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2.5 py-1 text-[10px] font-medium text-yellow-400 sm:text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 2 && (
                              <span className="rounded-full bg-neutral-800 px-2 py-1 text-[10px] text-neutral-500 sm:text-xs">
                                +{note.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Título */}
                      <h3 className="mb-2 line-clamp-2 flex-shrink-0 text-sm leading-tight font-semibold text-white transition-colors group-hover:text-yellow-400 sm:mb-3 sm:text-base lg:text-lg">
                        {note.title || "Nota sem título"}
                      </h3>

                      {/* Descrição - ocupa espaço flexível */}
                      <div className="mb-2 flex-1 sm:mb-4">
                        {note.preview && (
                          <p className="line-clamp-4 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                            {note.preview.length > 120
                              ? note.preview.substring(0, 120) + "..."
                              : note.preview}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Indicadores de slides */}
              {recentNotes.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5 sm:mt-4 sm:gap-2">
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
