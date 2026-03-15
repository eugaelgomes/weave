"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileText, Tag, Activity } from "lucide-react";
import { FaProjectDiagram } from "react-icons/fa";
import { useLanguage } from "@/app/_contexts/language-context";

interface StatsProps {
  stats: any;
  projectsStats: any;
  tagCloudData: any[];
}

export function Stats({ stats, projectsStats, tagCloudData }: StatsProps) {
  const { t } = useLanguage();
  const [showMetrics, setShowMetrics] = useState(false);
  const [showTags, setShowTags] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-[260px_1fr]">
      {/* === CARD 1 — MÉTRICAS === */}
      <div className="flex flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-md backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950">
        <button
          onClick={() => setShowMetrics(!showMetrics)}
          className="flex w-full items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-2 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900/50"
        >
          <h3 className="font-mono text-[9px] font-bold tracking-widest text-neutral-600 uppercase sm:text-[10px] dark:text-neutral-500">
            {t.home.metrics}
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
                  {t.home.totalNotes}
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
                  {t.home.uniqueTags}
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
                    {t.home.totalProjects}
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
                    {t.home.activeProjects}
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
            {t.home.tagCloud}
          </h3>
          <span className="text-neutral-600 sm:hidden dark:text-neutral-500">
            {showTags ? "−" : "+"}
          </span>
        </button>

        <div className={`${showTags ? "block" : "hidden"} flex-1 sm:block`}>
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-6 sm:p-8">
            <span className="mb-2 flex items-center gap-2 text-neutral-400">
              {t.home.tagCloudDescription}
            </span>
            {tagCloudData.length > 0 ? (
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
                {tagCloudData.map((tagInfo, i) => (
                  <Link
                    key={i}
                    href={`/app/notes?tag=${tagInfo.tag}`}
                    title={`${tagInfo.count} ${t.common.notes}`}
                    className={` ${tagInfo.sizeClass} ${tagInfo.colorClass} ${tagInfo.weightClass} group cursor-pointer font-sans transition-all duration-300 hover:scale-110 hover:brightness-125 dark:brightness-125 dark:saturate-150`}
                  >
                    {tagInfo.tag}
                    <span className="ml-0.5 align-top text-[0.5em] font-bold text-neutral-300 opacity-50 transition-colors group-hover:text-current group-hover:opacity-100">
                      {tagInfo.count}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-neutral-500">
                <Tag className="mb-2 h-8 w-8 opacity-20" />
                <p className="font-mono text-xs">{t.home.notEnoughTags}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
