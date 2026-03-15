"use client";

import React, { useMemo } from "react";

// Contexts
import { useAuth } from "../../_contexts/auth-context";
import { useNotes } from "../../_contexts/notes-context";
import { useProjects } from "../../_contexts/projects-context";
import { useLanguage } from "@/app/_contexts/language-context";

// Utils & Components
import { getTagColor } from "@/app/_utils/tag-colors";
import { Stats } from "../_components/ui/home/stats";
import { CalendarPreview } from "../_components/ui/calendar/calendar-component";
import { useFormatters } from "@/app/_utils/product-patterns";
import ModalChat from "../_components/ui/weave-ai/chat-widget";
import NotesCarousel from "../_components/ui/notes/notes-carousel";
import ProjectsCarousel from "../_components/ui/projects/project-carousel";


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
  const { dateFormat, timeFormat } = useFormatters();
  const { t } = useLanguage();

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

  const userCurrentDateTime = new Date();

  const stats = getNotesStats();
  const projectsStats = getProjectsStats();
  const recentNotes = getRecentNotes();
  const recentProjects = getRecentProjects();
  const userName = String(user?.user_name || user?.username || t.common.user);

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
              <span className="text-yellow-500">{t.greeting.hello}</span>{" "}
              {getFirstAndLastUserName(userName)}!
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-600 sm:gap-4 sm:text-sm dark:text-neutral-400">
            <span className="truncate text-xs">
              {`${dateFormat(userCurrentDateTime)} ${timeFormat(userCurrentDateTime)}`}
            </span>
            {/* Health Status Indicator - Commented Out */}
            {/*
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
            */}
          </div>
        </div>

        {/* Estatísticas e Mapa Mental */}
        <Stats stats={stats} projectsStats={projectsStats} tagCloudData={tagCloudData} />

        {/*Weave-AI Modal*/}
        <ModalChat />

        {/* Recents Notes Carrossel */}
        <NotesCarousel notes={recentNotes} />

        {/* Recent Projects Carrossel */}
        <ProjectsCarousel projects={recentProjects} />

        {/* Calendar Component */}
        <CalendarPreview />
      </div>
    </div>
  );
}
