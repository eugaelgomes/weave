"use client";

import React from "react";
import Link from "next/link";
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
} from "lucide-react";
import type { ProjectOverview } from "../../../_contexts/projects-context";
import { getTagColor } from "@/app/_utils/tag-colors";

interface ProjectsCarouselProps {
  projects: ProjectOverview[];
  title?: string;
  emptyMessage?: string;
  emptyActionText?: string;
  emptyActionHref?: string;
}

// Configuração de cores adaptada para Light/Dark
const STATUS_CONFIG = {
  open: {
    label: "Aberto",
    icon: CircleDot,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-500/10",
    border: "border-cyan-200 dark:border-cyan-500/20",
  },
  running: {
    label: "Em Andamento",
    icon: PlayCircle,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-500/10",
    border: "border-green-200 dark:border-green-500/20",
  },
  "on-hold": {
    label: "Pausado",
    icon: PauseCircle,
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    border: "border-yellow-200 dark:border-yellow-500/20",
  },
  archived: {
    label: "Arquivado",
    icon: Archive,
    color: "text-neutral-500 dark:text-neutral-500",
    bg: "bg-neutral-100 dark:bg-neutral-500/10",
    border: "border-neutral-200 dark:border-neutral-500/20",
  },
};

export default function ProjectsCarousel({
  projects,
  title = "Projetos Recentes",
  emptyMessage = "Você ainda não tem projetos",
  emptyActionText = "Criar Primeiro Projeto",
  emptyActionHref = "/app/projects",
}: ProjectsCarouselProps) {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  const scrollToSlide = (index: number) => {
    if (carouselRef.current && projects.length > 0) {
      const cardWidth = carouselRef.current.scrollWidth / projects.length;
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
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 shadow-md sm:p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
        <h3 className="sm:text-md text-base font-semibold text-neutral-500 dark:text-neutral-100">
          {title}
        </h3>
        {projects.length > 1 && (
          <div className="flex gap-1.5 sm:gap-2">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="rounded-md bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlide === projects.length - 1}
              className="rounded-md bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="py-8 text-center text-neutral-500 dark:text-neutral-400">
          <Folder className="mx-auto mb-2 h-10 w-10 text-neutral-400 dark:text-neutral-600" />
          <p className="mb-2 text-base font-medium text-neutral-700 dark:text-neutral-200">
            {emptyMessage}
          </p>
          <Link
            href={emptyActionHref}
            className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
          >
            <Folder className="h-4 w-4" /> {emptyActionText}
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={carouselRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth sm:gap-4"
          >
            {projects.map((project) => {
              const statusConfig = project.status
                ? STATUS_CONFIG[project.status as keyof typeof STATUS_CONFIG]
                : null;
              const StatusIcon = statusConfig?.icon;

              return (
                <Link
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  className="block w-[calc(100vw-3rem)] max-w-[280px] flex-shrink-0 snap-start sm:w-[320px] sm:max-w-[340px]"
                >
                  <div className="group flex h-[260px] flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition-all duration-200 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50 sm:h-[260px] dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:shadow-neutral-900/50">
                    {/* Cabeçalho com ícone e prioridade */}
                    <div className="mb-2 flex flex-shrink-0 items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        {project.icon && (
                          <span className="text-md flex-shrink-0">{project.icon}</span>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm leading-tight font-semibold text-neutral-900 transition-colors group-hover:text-yellow-600 sm:text-base dark:text-white dark:group-hover:text-yellow-400">
                            {project.title}
                          </h3>
                        </div>
                      </div>
                      {project.priority && (
                        <div
                          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${
                            project.priority === "alta"
                              ? "text-red-600 dark:text-red-400"
                              : project.priority === "media"
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-blue-600 dark:text-blue-400"
                          }`}
                          title={`Prioridade: ${project.priority}`}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Descrição */}
                    <div className="mb-3 min-h-0 flex-1">
                      {project.description && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500 sm:text-sm dark:text-neutral-400">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                      <div className="mb-3 flex flex-shrink-0 flex-wrap gap-1.5">
                        {project.tags.slice(0, 3).map((tag, idx) => {
                          const tagColor = getTagColor(tag);
                          return (
                            <span
                              key={idx}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium ${tagColor.bg} ${tagColor.text} ${tagColor.border}`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                        {project.tags.length > 3 && (
                          <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-400">
                            +{project.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Metadata Row: Complexidade e Tempo Estimado */}
                    {(project.complexity || project.estimatedTime) && (
                      <div className="mb-3 flex w-full items-center justify-between border-t border-neutral-100 pt-2 dark:border-neutral-800/50">
                        {/* Complexidade — Esquerda */}
                        {project.complexity && (
                          <div className="flex items-center gap-1.5">
                            <Zap
                              className={`h-3 w-3 ${
                                project.complexity === "alta"
                                  ? "text-red-500 dark:text-red-400"
                                  : project.complexity === "media"
                                    ? "text-yellow-500 dark:text-yellow-400"
                                    : "text-green-500 dark:text-green-400"
                              }`}
                            />
                            <span className="text-[10px] font-medium text-neutral-500 capitalize dark:text-neutral-400">
                              {project.complexity}
                            </span>
                          </div>
                        )}

                        {/* Prazo — Direita */}
                        {project.estimatedTime && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
                            <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                              {project.estimatedTime}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progresso */}
                    <div className="mb-3 flex-shrink-0">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-neutral-500 sm:text-xs dark:text-neutral-500">
                          Progresso
                        </span>
                        <span className="text-[10px] font-bold text-neutral-700 sm:text-xs dark:text-neutral-400">
                          {project.progress ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${project.progress ?? 0}%`,
                            backgroundColor: project.color || "#eab308",
                          }}
                        />
                      </div>
                    </div>

                    {/* Rodapé com Status e Contadores */}
                    <div className="flex flex-shrink-0 items-center justify-between gap-2">
                      <div>
                        {statusConfig && StatusIcon && (
                          <div
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${statusConfig.bg} ${statusConfig.border}`}
                          >
                            <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                            <span className={`text-[10px] font-medium ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Contador de Notas */}
                        {project.notesCount > 0 && (
                          <div
                            className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500"
                            title={`${project.notesCount} nota(s)`}
                          >
                            <FileText className="h-3 w-3" />
                            <span className="text-[10px] font-medium">{project.notesCount}</span>
                          </div>
                        )}

                        {/* Contador de Colaboradores */}
                        {project.collaboratorsCount > 0 && (
                          <div
                            className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500"
                            title={`${project.collaboratorsCount} colaborador(es)`}
                          >
                            <Users className="h-3 w-3" />
                            <span className="text-[10px] font-medium">
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
            <div className="mt-4 flex justify-center gap-1.5 sm:gap-2">
              {projects.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentSlide === index
                      ? "w-6 bg-yellow-500"
                      : "w-1.5 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                  }`}
                  aria-label={`Ir para projeto ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
