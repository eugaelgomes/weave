"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useNotes } from "../../contexts/NotesContext";
import { useProjects } from "../../contexts/ProjectsContext";
import { checkHealth, type HealthStatus } from "../../services";
import { getTagColor } from "@/app/utils/tag-colors";
import NotesCarousel from "../../components/ui/notes-carousel";
import ProjectsCarousel from "../../components/ui/project-carousel";
import { FileText, Tag } from "lucide-react";

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
  const [showTags, setShowTags] = useState(false);
  const [healthStatus, setHealthStatus] = React.useState<HealthStatus | null>(null);

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

      // Obter cor baseada na primeira letra da tag (consistente com o resto da aplicação)
      const tagColors = getTagColor(tagItem.tag);
      // Extrair apenas a classe de texto da cor
      const colorClass = tagColors.text;

      // Aleatoriedade para peso da fonte (Bold ou Normal)
      const isBold = Math.random() > 0.4 ? "font-bold" : "font-medium";

      return {
        ...tagItem,
        sizeClass: FONT_SIZES[sizeIndex],
        colorClass,
        weightClass: isBold,
      };
    });
  }, [stats?.mostUsedTags]);

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 py-2 dark:bg-neutral-950">
      <div className="flex-1 space-y-3 overflow-y-auto sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-2">
            <span className="sm:text-md text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
              <span className="text-yellow-500">Olá,</span> {userName}!
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-neutral-600 sm:gap-4 sm:text-sm dark:text-neutral-400">
            <span className="truncate text-xs">{userCurrentDateTime}</span>
            <div className="flex items-center gap-2 rounded border border-neutral-300 bg-neutral-100 px-2 py-1 dark:border-neutral-800/50 dark:bg-neutral-950/50">
              {healthStatus ? (
                <>
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${healthStatus.status === "online" ? "bg-emerald-500" : "bg-red-500"}`}
                  />
                  <span className="font-mono text-[10px] font-medium tracking-wider text-neutral-700 dark:text-neutral-400">
                    {healthStatus.status === "online" ? "System OK" : "Offline"}
                  </span>
                </>
              ) : (
                <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-600">
                  Verificando...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas e Mapa Mental */}
        <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-[260px_1fr]">
          {/* === CARD 1 — MÉTRICAS === */}
          <div className="flex flex-col rounded-md border border-neutral-200 bg-white backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/50">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="flex w-full items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900/50"
            >
              <h3 className="font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase sm:text-[10px] dark:text-neutral-500">
                Métricas
              </h3>
              <span className="text-neutral-500 sm:hidden">{showMetrics ? "−" : "+"}</span>
            </button>

            <div className={`${showMetrics ? "block" : "hidden"} sm:block`}>
              <div className="flex flex-col">
                {/* Total Notas */}
                <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-100 sm:gap-3 sm:py-3 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-yellow-400/20 bg-yellow-400/10 text-yellow-400">
                      <FileText className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                      Total de Notas
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-yellow-400">
                    {String(stats?.totalNotes ?? 0).padStart(2, "0")}
                  </span>
                </div>
                {/* Tags Únicas */}
                <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-100 sm:gap-3 sm:py-3 dark:hover:bg-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-blue-400/20 bg-blue-400/10 text-blue-400">
                      <Tag className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
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
          <div className="flex flex-col rounded-md border border-neutral-200 bg-white backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/50">
            <button
              onClick={() => setShowTags(!showTags)}
              className="flex w-full items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900/30"
            >
              <h3 className="font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase sm:text-[10px] dark:text-neutral-500">
                Nuvem de Tags
              </h3>
              <span className="text-neutral-600 sm:hidden dark:text-neutral-500">
                {showTags ? "−" : "+"}
              </span>
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
        <NotesCarousel notes={recentNotes} />

        {/* Projetos Recentes - Carrossel */}
        <ProjectsCarousel projects={recentProjects} />
      </div>
    </div>
  );
}
