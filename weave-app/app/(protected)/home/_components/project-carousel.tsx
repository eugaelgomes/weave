"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Folder,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Zap,
  Users,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Archive,
  CircleDot,
  FileText,
  Calendar,
} from "lucide-react";
import type { ProjectOverview } from "@/app/_contexts/projects-context";
import { getTagColor } from "@/app/_utils/tag-colors";
import { PROJECT_STATUS } from "@/app/_utils/db-enums";
import { useLanguage } from "@/app/_contexts/language-context";

interface ProjectsCarouselProps {
  projects: ProjectOverview[];
  title?: string;
  emptyMessage?: string;
  emptyActionText?: string;
  emptyActionHref?: string;
}

const STATUS_CONFIG = {
  [PROJECT_STATUS.OPEN]: {
    label: "Aberto",
    icon: CircleDot,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-500/10",
    border: "border-cyan-200 dark:border-cyan-500/20",
  },
  [PROJECT_STATUS.IN_PROGRESS]: {
    label: "Em Andamento",
    icon: PlayCircle,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
  },
  [PROJECT_STATUS.COMPLETED]: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-500/10",
    border: "border-green-200 dark:border-green-500/20",
  },
  [PROJECT_STATUS.PAUSED]: {
    label: "Pausado",
    icon: PauseCircle,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-brand-primary-500/10",
    border: "border-yellow-200 dark:border-yellow-500/20",
  },
  [PROJECT_STATUS.ARCHIVED]: {
    label: "Arquivado",
    icon: Archive,
    color: "text-neutral-500 dark:text-neutral-500",
    bg: "bg-neutral-100 dark:bg-neutral-500/10",
    border: "border-neutral-200 dark:border-surface-dark-border-muted",
  },
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date;
};

export default function ProjectsCarousel({
  projects,
  title,
  emptyMessage,
  emptyActionText,
  emptyActionHref = "/projects",
}: ProjectsCarouselProps) {
  const { t, locale } = useLanguage();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  const dateLocale = locale === "en-US" ? "en-US" : locale === "es-ES" ? "es-ES" : "pt-BR";
  const resolvedTitle = title ?? t.home.carousel.recentProjectsTitle;
  const resolvedEmptyMessage = emptyMessage ?? t.home.carousel.emptyProjects;
  const resolvedEmptyAction = emptyActionText ?? t.home.carousel.emptyProjectsAction;

  const scrollToSlide = (index: number) => {
    if (carouselRef.current && projects.length > 0) {
      const cardWidth = 220 + 8;
      carouselRef.current.scrollTo({ left: cardWidth * index, behavior: "smooth" });
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    if (currentSlide < projects.length - 1) scrollToSlide(currentSlide + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) scrollToSlide(currentSlide - 1);
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-2 shadow-md sm:p-3 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-neutral-500 sm:text-sm dark:text-neutral-100">
          {resolvedTitle}
        </h3>
        {projects.length > 1 && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="rounded bg-neutral-100 p-1 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label={t.home.carousel.carouselPrev}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              disabled={currentSlide === projects.length - 1}
              className="rounded bg-neutral-100 p-1 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label={t.home.carousel.carouselNext}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="py-4 text-center text-neutral-500 dark:text-neutral-400">
          <Folder className="mx-auto mb-2 h-8 w-8 text-neutral-400 dark:text-neutral-600" />
          <p className="mb-2 text-xs font-medium text-neutral-700 dark:text-neutral-200">
            {resolvedEmptyMessage}
          </p>
          <Link
            href={emptyActionHref}
            className="bg-brand-primary-500 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
          >
            <Folder className="h-3 w-3" /> {resolvedEmptyAction}
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={carouselRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1"
          >
            {projects.map((project) => {
              const statusConfig = project.status
                ? STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG]
                : null;
              const StatusIcon = statusConfig?.icon;
              const methodologyKey = String(project.methodology || "kanban").toLowerCase();
              const methodologyLabel =
                methodologyKey === "scrum"
                  ? t.home.carousel.methodologyScrum
                  : t.home.carousel.methodologyKanban;
              const updatedAt = formatDate(project.lastModified);

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block w-[75vw] max-w-[220px] flex-shrink-0 snap-center sm:w-[220px] sm:snap-start"
                >
                  <div className="group flex min-h-[176px] flex-col rounded-md border border-neutral-200 bg-neutral-50 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-200/50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:hover:border-surface-dark-border-strong dark:hover:shadow-surface-dark-md">
                    <div className="mb-1.5 flex flex-shrink-0 items-start justify-between gap-1.5">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        {project.icon && (
                          <span className="flex-shrink-0 text-xs">{project.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-xs leading-tight font-semibold text-neutral-900 transition-colors group-hover:text-yellow-600 dark:text-white dark:group-hover:text-yellow-400">
                            {project.title}
                          </h3>
                        </div>
                      </div>
                      {project.priority && (
                        <div
                          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[2px] ${
                            project.priority === "alta"
                              ? "text-red-600 dark:text-red-400"
                              : project.priority === "media"
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-blue-600 dark:text-blue-400"
                          }`}
                          title={`Prioridade: ${project.priority}`}
                        >
                          <AlertCircle className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div className="mb-1.5 flex flex-shrink-0 items-center justify-between gap-1 text-[8px] text-neutral-500 dark:text-neutral-400">
                      <span className="shrink-0 rounded border border-neutral-200 bg-neutral-100 px-1.5 py-[1px] font-semibold text-neutral-700 dark:border-surface-dark-border-strong dark:bg-neutral-800/80 dark:text-neutral-200">
                        {methodologyLabel}
                      </span>
                      {updatedAt ? (
                        <span className="flex min-w-0 items-center gap-0.5 truncate">
                          <Calendar className="h-2.5 w-2.5 shrink-0 text-neutral-400" />
                          <span className="truncate">
                            {t.home.carousel.updated}:{" "}
                            {updatedAt.toLocaleDateString(dateLocale, {
                              day: "2-digit",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                        </span>
                      ) : null}
                    </div>

                    <div className="mb-1.5 min-h-0 flex-1">
                      {project.description && (
                        <p className="line-clamp-2 text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {project.tags && project.tags.length > 0 && (
                      <div className="mb-1.5 flex flex-shrink-0 flex-wrap gap-1">
                        {project.tags.slice(0, 3).map((tag, idx) => {
                          const tagColor = getTagColor(tag);
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-[1px] text-[8px] font-medium ${tagColor.bg} ${tagColor.text} ${tagColor.border}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                        {project.tags.length > 3 && (
                          <span className="inline-flex items-center rounded border border-neutral-200 bg-neutral-100 px-1.5 py-[1px] text-[8px] font-medium text-neutral-500 dark:border-surface-dark-border-strong dark:bg-neutral-800/70 dark:text-neutral-400">
                            +{project.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {(project.complexity || project.estimatedTime) && (
                      <div className="mb-1.5 flex w-full items-center justify-between border-t border-neutral-100 pt-1.5 dark:border-surface-dark-border-muted">
                        {project.complexity && (
                          <div className="flex items-center gap-1">
                            <Zap
                              className={`h-2.5 w-2.5 ${
                                project.complexity === "alta"
                                  ? "text-red-500 dark:text-red-400"
                                  : project.complexity === "media"
                                    ? "text-brand-primary-500 dark:text-yellow-400"
                                    : "text-green-500 dark:text-green-400"
                              }`}
                            />
                            <span className="text-[8px] font-medium text-neutral-500 capitalize dark:text-neutral-400">
                              {project.complexity}
                            </span>
                          </div>
                        )}

                        {project.estimatedTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-neutral-400 dark:text-neutral-500" />
                            <span className="text-[8px] font-medium text-neutral-500 dark:text-neutral-400">
                              {project.estimatedTime}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {(project.subprojectsCount ?? 0) > 0 || (project.stagesCount ?? 0) > 0 ? (
                      <div className="mb-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[7px] font-medium text-neutral-500 dark:text-neutral-400">
                        {(project.subprojectsCount ?? 0) > 0 ? (
                          <span>
                            {t.home.carousel.subprojectsCount.replace(
                              "{count}",
                              String(project.subprojectsCount)
                            )}
                          </span>
                        ) : null}
                        {(project.stagesCount ?? 0) > 0 ? (
                          <span>
                            {t.home.carousel.columnsCount.replace(
                              "{count}",
                              String(project.stagesCount)
                            )}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mb-1.5 flex-shrink-0">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[8px] font-medium text-neutral-500 dark:text-neutral-500">
                          {t.home.carousel.progress}
                        </span>
                        <span className="text-[8px] font-bold text-neutral-700 dark:text-neutral-400">
                          {project.progress ?? 0}%
                        </span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${project.progress ?? 0}%`,
                            backgroundColor: project.color || "#eab308",
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-shrink-0 items-center justify-between gap-1.5">
                      <div className="flex min-w-0 items-center gap-1">
                        {statusConfig && StatusIcon && (
                          <div
                            className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-[1px] ${statusConfig.bg} ${statusConfig.border}`}
                          >
                            <StatusIcon className={`h-2.5 w-2.5 ${statusConfig.color}`} />
                            <span className={`text-[8px] font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        )}
                        {project.owner_name ? (
                          <div
                            className="flex shrink-0 items-center gap-0.5"
                            title={`${t.home.carousel.ownerTitle}: ${project.owner_name}`}
                          >
                            {project.owner_avatar_url ? (
                              <div className="relative h-4 w-4 overflow-hidden rounded-full border border-neutral-200 dark:border-surface-dark-border-strong">
                                <Image
                                  src={project.owner_avatar_url}
                                  alt={project.owner_name}
                                  width={16}
                                  height={16}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100 text-[6px] font-bold text-neutral-600 dark:border-surface-dark-border-strong dark:bg-neutral-800 dark:text-neutral-300">
                                {project.owner_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {project.notesCount > 0 && (
                          <div
                            className="flex items-center gap-0.5 text-neutral-400 dark:text-neutral-500"
                            title={`${project.notesCount} tarefa(s)`}
                          >
                            <FileText className="h-2.5 w-2.5" />
                            <span className="text-[8px] font-medium">{project.notesCount}</span>
                          </div>
                        )}

                        {project.collaboratorsCount > 0 && (
                          <div
                            className="flex items-center gap-0.5 text-neutral-400 dark:text-neutral-500"
                            title={`${project.collaboratorsCount} colaborador(es)`}
                          >
                            <Users className="h-2.5 w-2.5" />
                            <span className="text-[8px] font-medium">
                              {project.collaboratorsCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {projects.length > 1 && (
            <div className="mt-2 flex justify-center gap-1">
              {projects.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={`h-1 rounded-full transition-all ${
                    currentSlide === index
                      ? "bg-brand-primary-500 w-4"
                      : "w-1 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                  }`}
                  aria-label={t.home.carousel.goToProject.replace("{n}", String(index + 1))}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
