"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useNotes } from "../../contexts/NotesContext";
import { useProjects } from "../../contexts/ProjectsContext";
import { checkHealth, type HealthStatus } from "../../services";
import { getTagColor } from "@/app/utils/tag-colors";
import NotesCarousel from "../components/ui/notes-carousel";
import ProjectsCarousel from "../components/ui/project-carousel";
import { FileText, Tag, Activity } from "lucide-react";
import { FaProjectDiagram } from "react-icons/fa";

const FONT_SIZES = [
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
];

const getFirstAndLastUserName = (fullName: string): string => {
  const names = fullName.trim().split(/\s+/);
  const capitalize = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  if (names.length === 1) {
    return capitalize(names[0]);
  }

  const firstName = capitalize(names[0]);
  const lastName = capitalize(names[names.length - 1]);

  return `${firstName} ${lastName}`;
};

export default function HomePage() {
  const { authenticated, loading, user } = useAuth();
  const { getNotesStats, getRecentNotes } = useNotes();
  const { getRecentProjects, getProjectsStats } = useProjects();
  const [showMetrics, setShowMetrics] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [healthStatus, setHealthStatus] = React.useState<HealthStatus | null>(null);

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
  const projectsStats = getProjectsStats();
  const recentNotes = getRecentNotes();
  const recentProjects = getRecentProjects();
  const userName = String(user?.user_name || user?.username || "usuário");

  const tagCloudData = useMemo(() => {
    if (!stats?.mostUsedTags || stats.mostUsedTags.length === 0) return [];

    const tags = stats.mostUsedTags;
    const maxCount = Math.max(...tags.map((t) => t.count));
    const minCount = Math.min(...tags.map((t) => t.count));

    const shuffledTags = [...tags].sort(() => Math.random() - 0.5);

    return shuffledTags.map((tagItem, index) => {
      const ratio =
        maxCount === minCount ? 0.5 : (tagItem.count - minCount) / (maxCount - minCount);

      const sizeIndex = Math.floor(ratio * (FONT_SIZES.length - 1));

      const tagColors = getTagColor(tagItem.tag);
      const colorClass = tagColors.text;

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
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-2 shadow shadow-md sm:gap-4 sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium tracking-tight text-neutral-900 sm:text-base dark:text-neutral-100">
              <span className="text-yellow-500">Olá,</span> {getFirstAndLastUserName(userName)}!
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-600 sm:gap-4 sm:text-sm dark:text-neutral-400">
            <span className="truncate text-xs">{userCurrentDateTime}</span>
            <div
              title={
                healthStatus
                  ? healthStatus.status === "offline"
                    ? "API Offline"
                    : `${healthStatus.responseTime}ms`
                  : "Verificando..."
              }
              className="flex items-center"
            >
              <div className="relative flex h-2 w-2">
                {healthStatus && healthStatus.status !== "offline" && (
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      healthStatus.responseTime < 200 ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  ></span>
                )}

                {/* Bolinha Principal */}
                <div
                  className={`relative h-2 w-2 rounded-full transition-colors ${
                    !healthStatus
                      ? "animate-pulse bg-neutral-400"
                      : healthStatus.status === "offline"
                        ? "bg-red-500"
                        : healthStatus.responseTime < 200
                          ? "bg-emerald-500"
                          : healthStatus.responseTime < 500
                            ? "bg-amber-500"
                            : "bg-red-500"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas e Mapa Mental */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[260px_1fr]">
          {/* === CARD 1 — MÉTRICAS === */}
          <div className="flex flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950">
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
                {/* Total Projetos */}
                {projectsStats && projectsStats.totalProjects > 0 && (
                  <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-100 sm:gap-3 sm:py-3 dark:hover:bg-neutral-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-purple-400/20 bg-purple-400/10 text-purple-400">
                        <FaProjectDiagram className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                        Total de Projetos
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold text-purple-400">
                      {String(projectsStats.totalProjects).padStart(2, "0")}
                    </span>
                  </div>
                )}
                {/* Projetos Ativos */}
                {projectsStats && projectsStats.totalProjects > 0 && (
                  <div className="group flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-neutral-100 sm:gap-3 sm:py-3 dark:hover:bg-neutral-800">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-emerald-400/20 bg-emerald-400/10 text-emerald-400">
                        <Activity className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[11px] font-medium text-neutral-600 transition-colors group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-neutral-200">
                        Projetos Ativos
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {String(projectsStats.activeProjects).padStart(2, "0")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* === CARD 2 — NUVEM DE PALAVRAS === */}
          <div className="flex flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950">
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
                        // ALTERAÇÃO AQUI: Adicionado dark:brightness-125 e dark:saturate-150
                        className={` ${tagInfo.sizeClass} ${tagInfo.colorClass} ${tagInfo.weightClass} group cursor-pointer font-sans transition-all duration-300 hover:scale-110 hover:brightness-125 dark:brightness-125 dark:saturate-150`}
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
