"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { routes } from "@/app/_utils/routes";
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
import { ProjectIcon } from "@/app/(protected)/[orgId]/projects/_components/project-icon";
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
    icon: CircleDot,
    color: "text-cyan-600 dark:text-cyan-400",
  },
  [PROJECT_STATUS.IN_PROGRESS]: {
    icon: PlayCircle,
    color: "text-blue-600 dark:text-blue-400",
  },
  [PROJECT_STATUS.COMPLETED]: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
  },
  [PROJECT_STATUS.PAUSED]: {
    icon: PauseCircle,
    color: "text-yellow-600 dark:text-yellow-400",
  },
  [PROJECT_STATUS.ARCHIVED]: {
    icon: Archive,
    color: "text-neutral-500 dark:text-neutral-500",
  },
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date;
};

export default function ProjectsCarousel({
  projects: initialProjects,
  title,
  emptyMessage,
  emptyActionText,
}: ProjectsCarouselProps) {
  const projects = (initialProjects || []).slice(0, 10);
  const params = useParams();
  const orgId = params?.orgId as string;
  const { t, locale } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const dateLocale = locale === "en-US" ? "en-US" : locale === "es-ES" ? "es-ES" : "pt-BR";

  const statusLabelByKey = React.useMemo(
    () => ({
      [PROJECT_STATUS.OPEN]: t.home.carousel.statusOpen,
      [PROJECT_STATUS.IN_PROGRESS]: t.home.carousel.statusInProgress,
      [PROJECT_STATUS.COMPLETED]: t.home.carousel.statusCompleted,
      [PROJECT_STATUS.PAUSED]: t.home.carousel.statusPaused,
      [PROJECT_STATUS.ARCHIVED]: t.home.carousel.statusArchived,
    }),
    [t]
  );
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
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2 px-2">
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
            href={routes.projects.list(orgId)}
            className="bg-brand-primary-500 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
          >
            <Folder className="h-3 w-3" /> {resolvedEmptyAction}
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={carouselRef}
            className="no-scrollbar -my-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-2 py-4"
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
              const counterParts: string[] = [];
              if ((project.subprojectsCount ?? 0) > 0) {
                counterParts.push(
                  t.home.carousel.subprojectsCount.replace(
                    "{count}",
                    String(project.subprojectsCount)
                  )
                );
              }
              if ((project.stagesCount ?? 0) > 0) {
                counterParts.push(
                  t.home.carousel.columnsCount.replace("{count}", String(project.stagesCount))
                );
              }

              const metaLine = [
                methodologyLabel,
                updatedAt
                  ? `${t.home.carousel.updated}: ${updatedAt.toLocaleDateString(dateLocale, {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <Link
                  key={project.id}
                  href={routes.projects.board(orgId, project.public_id || project.id)}
                  className="block w-[75vw] max-w-[220px] flex-shrink-0 snap-center sm:w-[220px] sm:snap-start"
                >
                  <div
                    className="group dark:border-surface-dark-border dark:hover:border-surface-dark-border-strong dark:shadow-surface-dark-sm dark:hover:shadow-surface-dark-md flex min-h-[148px] flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-2.5 font-normal shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md dark:bg-[#1d1d1b]"
                  >
                    <div className="flex flex-1 flex-col">
                      <div className="mb-1.5 flex flex-shrink-0 items-start justify-between gap-1.5">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <ProjectIcon icon={project.icon} color={project.color} size="xs" />
                          <h3 className="line-clamp-1 text-xs leading-tight font-normal text-neutral-900 transition-colors group-hover:text-yellow-600 dark:text-white dark:group-hover:text-yellow-400">
                            {project.title}
                          </h3>
                        </div>
                        {project.priority && (
                          <div
                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center ${
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

                      <p className="mb-1.5 truncate text-[8px] font-normal text-neutral-500 dark:text-neutral-400">
                        {metaLine}
                      </p>

                      {project.description && (
                        <p className="mb-1.5 line-clamp-2 text-[10px] leading-relaxed font-normal text-neutral-500 dark:text-neutral-400">
                          {project.description}
                        </p>
                      )}

                      {project.tags && project.tags.length > 0 && (
                        <p className="mb-1.5 flex flex-wrap items-center gap-x-1 text-[8px] font-normal">
                          {project.tags.slice(0, 2).map((tag, idx) => {
                            const tagColor = getTagColor(tag);
                            return (
                              <React.Fragment key={idx}>
                                {idx > 0 && (
                                  <span className="text-neutral-400 dark:text-neutral-500">·</span>
                                )}
                                <span className={tagColor.text}>{tag}</span>
                              </React.Fragment>
                            );
                          })}
                        </p>
                      )}

                      {(project.complexity || project.estimatedTime) && (
                        <p className="mb-1.5 flex items-center justify-between text-[8px] font-normal text-neutral-500 dark:text-neutral-400">
                          {project.complexity ? (
                            <span className="inline-flex items-center gap-1 capitalize">
                              <Zap
                                className={`h-2.5 w-2.5 ${
                                  project.complexity === "alta"
                                    ? "text-red-500 dark:text-red-400"
                                    : project.complexity === "media"
                                      ? "text-brand-primary-500 dark:text-yellow-400"
                                      : "text-green-500 dark:text-green-400"
                                }`}
                              />
                              {project.complexity}
                            </span>
                          ) : (
                            <span />
                          )}
                          {project.estimatedTime ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-neutral-400 dark:text-neutral-500" />
                              {project.estimatedTime}
                            </span>
                          ) : null}
                        </p>
                      )}

                      <p className="mb-1.5 text-[8px] font-normal text-neutral-500 dark:text-neutral-400">
                        {t.home.carousel.progress} {project.progress ?? 0}%
                      </p>
                    </div>

                    <div className="mt-auto">
                      {counterParts.length > 0 && (
                        <p className="mb-1 flex flex-wrap items-center gap-x-1.5 text-[7px] font-normal text-neutral-500 dark:text-neutral-400">
                          {counterParts.map((part, index) => (
                            <React.Fragment key={`counter-${index}`}>
                              {index > 0 && (
                                <span className="text-neutral-400 dark:text-neutral-500">·</span>
                              )}
                              <span>{part}</span>
                            </React.Fragment>
                          ))}
                        </p>
                      )}

                      <div className="flex flex-shrink-0 items-center justify-between gap-1.5 pt-1">
                        <div className="flex min-w-0 items-center gap-1">
                          {statusConfig && StatusIcon && (
                            <span
                              className={`inline-flex shrink-0 items-center gap-1 text-[8px] font-normal ${statusConfig.color}`}
                            >
                              <StatusIcon className="h-2.5 w-2.5" />
                              {statusLabelByKey[project.status as keyof typeof statusLabelByKey] ||
                                project.status}
                            </span>
                          )}
                          {project.owner_name ? (
                            <div
                              className="flex shrink-0 items-center gap-0.5"
                              title={`${t.home.carousel.ownerTitle}: ${project.owner_name}`}
                            >
                              {project.owner_avatar_url ? (
                                <div className="relative h-4 w-4 overflow-hidden rounded-full">
                                  <Image
                                    src={project.owner_avatar_url}
                                    alt={project.owner_name}
                                    width={16}
                                    height={16}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="flex h-4 w-4 items-center justify-center text-[6px] font-normal text-neutral-600 dark:text-neutral-300">
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
                              <span className="text-[8px] font-normal">{project.notesCount}</span>
                            </div>
                          )}

                          {project.collaboratorsCount > 0 && (
                            <div
                              className="flex items-center gap-0.5 text-neutral-400 dark:text-neutral-500"
                              title={`${project.collaboratorsCount} colaborador(es)`}
                            >
                              <Users className="h-2.5 w-2.5" />
                              <span className="text-[8px] font-normal">
                                {project.collaboratorsCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
            <div className="w-2 shrink-0" aria-hidden="true" />
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
