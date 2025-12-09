"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useNotes } from "../../contexts/NotesContext";
import { useProjects } from "../../contexts/ProjectsContext";
import { checkHealth, type HealthStatus } from "../../services";
import {
  FileText,
  Tag,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Folder,
  AlertCircle,
  Clock,
  Zap,
  Users,
} from "lucide-react";

// Paleta de cores inspirada na imagem de referência
const TAG_COLORS = [
  "text-blue-500",
  "text-green-500",
  "text-purple-500",
  "text-yellow-500",
  "text-pink-500",
  "text-orange-500",
  "text-teal-400",
  "text-indigo-400",
];

// Tamanhos de fonte do menor para o maior
const FONT_SIZES = [
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
];

export default function HomePage() {
  const { authenticated, loading, user } = useAuth();
  const { getNotesStats, getRecentNotes } = useNotes();
  const { getRecentProjects } = useProjects();
  const [showMetrics, setShowMetrics] = useState(false);
  const [showTags, setShowTags] = useState(false); // Mantive true por padrão para ver a nuvem
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [currentProjectSlide, setCurrentProjectSlide] = React.useState(0);
  const [healthStatus, setHealthStatus] = React.useState<HealthStatus | null>(null);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const projectCarouselRef = React.useRef<HTMLDivElement>(null);

  // Verificar health do servidor
  React.useEffect(() => {
    const fetchHealth = async () => {
      const status = await checkHealth();
      setHealthStatus(status);
    };

    fetchHealth();
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
  const recentProjects = getRecentProjects();
  const userName = String(user?.name || user?.username || "usuário");

  // --- LÓGICA DA NUVEM DE PALAVRAS ---
  const tagCloudData = useMemo(() => {
    if (!stats?.mostUsedTags || stats.mostUsedTags.length === 0) return [];

    const tags = stats.mostUsedTags;
    // Encontrar o maior e menor count para normalizar
    const maxCount = Math.max(...tags.map((t) => t.count));
    const minCount = Math.min(...tags.map((t) => t.count));

    // Embaralhar levemente o array para não ficar ordenado por tamanho (estética de nuvem)
    // Criamos uma cópia para não mutar o original
    const shuffledTags = [...tags].sort(() => Math.random() - 0.5);

    return shuffledTags.map((tagItem, index) => {
      // Cálculo de proporção para definir o tamanho (0 a 1)
      const ratio =
        maxCount === minCount ? 0.5 : (tagItem.count - minCount) / (maxCount - minCount);

      // Mapear ratio para um índice do array de tamanhos
      const sizeIndex = Math.floor(ratio * (FONT_SIZES.length - 1));

      // Cor aleatória baseada no índice (para ser consistente entre renders, usamos o índice original ou hash, aqui simplificado)
      const color = TAG_COLORS[index % TAG_COLORS.length];

      // Aleatoriedade para peso da fonte (Bold ou Normal)
      const isBold = Math.random() > 0.4 ? "font-bold" : "font-medium";

      return {
        ...tagItem,
        sizeClass: FONT_SIZES[sizeIndex],
        colorClass: color,
        weightClass: isBold,
      };
    });
  }, [stats?.mostUsedTags]);

  // Controles dos Carrosséis (Mantidos originais)
  const scrollToSlide = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.scrollWidth / recentNotes.length;
      carouselRef.current.scrollTo({ left: cardWidth * index, behavior: "smooth" });
      setCurrentSlide(index);
    }
  };
  const nextSlide = () => {
    if (currentSlide < recentNotes.length - 1) scrollToSlide(currentSlide + 1);
  };
  const prevSlide = () => {
    if (currentSlide > 0) scrollToSlide(currentSlide - 1);
  };

  const scrollToProjectSlide = (index: number) => {
    if (projectCarouselRef.current) {
      const cardWidth = projectCarouselRef.current.scrollWidth / recentProjects.length;
      projectCarouselRef.current.scrollTo({ left: cardWidth * index, behavior: "smooth" });
      setCurrentProjectSlide(index);
    }
  };
  const nextProjectSlide = () => {
    if (currentProjectSlide < recentProjects.length - 1)
      scrollToProjectSlide(currentProjectSlide + 1);
  };
  const prevProjectSlide = () => {
    if (currentProjectSlide > 0) scrollToProjectSlide(currentProjectSlide - 1);
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 py-2">
      <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-md border border-neutral-800 bg-neutral-900 p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="sm:text-md text-base font-medium tracking-tight text-neutral-100">
              <span className="text-yellow-500">Olá,</span> {userName}!
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-neutral-400 sm:gap-4 sm:text-sm">
            <span className="truncate text-xs">{userCurrentDateTime}</span>
            <div className="flex items-center gap-2 rounded border border-neutral-800/50 bg-neutral-950/50 px-2 py-1">
              {healthStatus ? (
                <>
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${healthStatus.status === "online" ? "bg-emerald-500" : "bg-red-500"}`}
                  />
                  <span className="font-mono text-[10px] font-medium tracking-wider text-neutral-400">
                    {healthStatus.status === "online" ? "System OK" : "Offline"}
                  </span>
                </>
              ) : (
                <span className="font-mono text-[10px] text-neutral-600">Verificando...</span>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas e Mapa Mental */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[260px_1fr]">
          {/* === CARD 1 — MÉTRICAS === */}
          <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="flex w-full items-center justify-between border-b border-neutral-800 bg-neutral-900/50 px-3 py-2 sm:px-4"
            >
              <h3 className="font-mono text-[9px] font-bold tracking-widest text-neutral-500 uppercase sm:text-[10px]">
                Métricas
              </h3>
              <span className="text-neutral-500 sm:hidden">{showMetrics ? "−" : "+"}</span>
            </button>

            <div className={`${showMetrics ? "block" : "hidden"} sm:block`}>
              <div className="flex flex-col">
                {/* Total Notas */}
                <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-800 sm:gap-3 sm:py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                      Total de Notas
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-yellow-400">
                    {String(stats?.totalNotes ?? 0).padStart(2, "0")}
                  </span>
                </div>
                {/* Tags Únicas */}
                <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-800 sm:gap-3 sm:py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-blue-400/20 bg-blue-400/10 text-blue-400">
                      <Tag className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-400 transition-colors group-hover:text-neutral-200">
                      Tags únicas
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-blue-400">
                    {String(stats?.totalTags ?? 0).padStart(2, "0")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* === CARD 2 — NUVEM DE PALAVRAS === */}
          <div className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <button
              onClick={() => setShowTags(!showTags)}
              className="flex w-full items-center justify-between border-b border-neutral-800 bg-neutral-900/30 px-3 py-2 sm:px-4"
            >
              <h3 className="font-mono text-[9px] font-bold tracking-widest text-neutral-500 uppercase sm:text-[10px]">
                Nuvem de Tags
              </h3>
              <span className="text-neutral-500 sm:hidden">{showTags ? "−" : "+"}</span>
            </button>

            <div className={`${showTags ? "block" : "hidden"} flex-1 sm:block`}>
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-6 sm:p-8">
                <span className="mb-2 flex items-center gap-2 text-neutral-400">
                  Essas são suas tags mais usadas
                </span>
                {tagCloudData.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
                    {tagCloudData.map((tagInfo, i) => (
                      <Link
                        key={i}
                        href={`/app/notes?tag=${tagInfo.tag}`}
                        title={`${tagInfo.count} notas`}
                        className={` ${tagInfo.sizeClass} ${tagInfo.colorClass} ${tagInfo.weightClass} group cursor-pointer font-sans transition-all duration-300 hover:scale-110 hover:brightness-125`}
                      >
                        {tagInfo.tag}
                        {/* O count agora é relativo (em), alinhado ao topo e muda de cor no hover */}
                        <span className="ml-0.5 align-top text-[0.5em] font-bold text-neutral-300 opacity-50 transition-colors group-hover:text-current group-hover:opacity-100">
                          {tagInfo.count}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-500">
                    <Tag className="mb-2 h-8 w-8 opacity-20" />
                    <p className="font-mono text-xs">Sem tags suficientes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notas Recentes - Carrossel */}
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
            <h3 className="sm:text-md text-base font-semibold text-neutral-100">Notas Recentes</h3>
            {recentNotes.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="rounded-md bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={currentSlide === recentNotes.length - 1}
                  className="rounded-md bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-30"
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
              <Link
                href="/app/notes"
                className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
              >
                <FileText className="h-4 w-4" /> Criar Primeira Nota
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
                      <div className="mb-2 flex flex-shrink-0 flex-col gap-2 sm:mb-3">
                        <h3 className="sm:text-md line-clamp-2 flex-shrink-0 text-base leading-tight font-semibold text-white transition-colors group-hover:text-yellow-400">
                          {note.title || "Nota sem título"}
                        </h3>
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
                          </div>
                        )}
                      </div>
                      <div className="mb-3 flex-1 overflow-hidden">
                        {note.preview && (
                          <p className="line-clamp-3 text-sm leading-relaxed text-neutral-400 sm:line-clamp-4">
                            {note.preview.substring(0, 150)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Projetos Recentes - Carrossel */}
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
            <h3 className="sm:text-md text-base font-semibold text-neutral-100">
              Projetos Recentes
            </h3>
            {recentProjects.length > 1 && (
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={prevProjectSlide}
                  disabled={currentProjectSlide === 0}
                  className="rounded-md bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextProjectSlide}
                  disabled={currentProjectSlide === recentProjects.length - 1}
                  className="rounded-md bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {/* Lógica de Projetos mantida igual (resumida aqui para caber na resposta) */}
          {recentProjects.length === 0 ? (
            <div className="py-8 text-center text-neutral-400">
              <Folder className="mx-auto mb-2 h-10 w-10 text-neutral-600" />
              <p className="mb-1 text-base font-medium text-neutral-200">
                Você ainda não tem projetos
              </p>
              <Link
                href="/app/projects"
                className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
              >
                <Folder className="h-4 w-4" /> Criar Primeiro Projeto
              </Link>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={projectCarouselRef}
                className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth sm:gap-3"
              >
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/projects/view/${project.id}`}
                    className="block w-[calc(100vw-2.5rem)] max-w-[300px] flex-shrink-0 snap-start sm:w-[280px] sm:max-w-[300px] md:w-[320px]"
                  >
                    <div
                      className="group flex h-[260px] flex-col rounded-md border border-neutral-800 p-3 transition-all duration-200 hover:border-neutral-700 hover:shadow-lg hover:shadow-neutral-900/50 sm:h-[280px] sm:p-4"
                      style={{
                        backgroundColor: project.color ? `${project.color}15` : "rgb(10 10 10 / 1)",
                        borderColor: project.color ? `${project.color}40` : "",
                      }}
                    >
                      <div className="mb-2 flex flex-shrink-0 items-start justify-between gap-2">
                        <h3 className="sm:text-md line-clamp-2 flex-1 text-base leading-tight font-semibold text-white transition-colors group-hover:text-yellow-400">
                          {project.title}
                        </h3>
                        {project.priority && (
                          <div
                            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${project.priority === "alta" ? "bg-red-500/20 text-red-400" : project.priority === "media" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="mb-3 flex-1 overflow-hidden">
                        {project.description && (
                          <p className="line-clamp-2 text-sm text-neutral-400">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
