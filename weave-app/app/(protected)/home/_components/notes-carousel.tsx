"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CircleCheck,
  GitBranch,
} from "lucide-react";

import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/_utils/collaborators";
import { getTagColor } from "@/app/_utils/tag-colors";
import { useLanguage } from "@/app/_contexts/language-context";
import { useTaskNoteModal } from "@/app/(protected)/_components/task-note-modal";
import { ProjectIcon } from "@/app/(protected)/projects/_components/project-icon";
import type { ProjectProperties } from "@/app/_services/projects-service/projects-service";

import type { NoteOverview } from "@/app/_contexts/notes-context";

interface NotesCarouselProps {
  notes: NoteOverview[];
  title?: string;
  emptyMessage?: string;
  emptyActionText?: string;
  emptyActionHref?: string;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date;
};

export default function NotesCarousel({
  notes,
  title,
  emptyMessage,
  emptyActionText,
  emptyActionHref = "/notes",
}: NotesCarouselProps) {
  const { t, locale } = useLanguage();
  const { openModal } = useTaskNoteModal();
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const dateLocale = locale === "en-US" ? "en-US" : locale === "es-ES" ? "es-ES" : "pt-BR";
  const resolvedTitle = title ?? t.home.carousel.recentNotesTitle;
  const resolvedEmptyMessage = emptyMessage ?? t.home.carousel.emptyNotes;
  const resolvedEmptyAction = emptyActionText ?? t.home.carousel.emptyNotesAction;

  const scrollToSlide = (index: number) => {
    if (carouselRef.current && notes.length > 0) {
      const cardWidth = 220 + 8;
      carouselRef.current.scrollTo({ left: cardWidth * index, behavior: "smooth" });
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    if (currentSlide < notes.length - 1) scrollToSlide(currentSlide + 1);
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
        {notes.length > 1 && (
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
              disabled={currentSlide === notes.length - 1}
              className="rounded bg-neutral-100 p-1 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label={t.home.carousel.carouselNext}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="py-4 text-center">
          <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
            <FileText className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="mb-2 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {resolvedEmptyMessage}
          </p>
          <Link
            href={emptyActionHref}
            className="bg-brand-primary-500 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600"
          >
            <FileText className="h-3 w-3" /> {resolvedEmptyAction}
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={carouselRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-1"
          >
            {notes.map((note) => {
              const validUpdated = formatDate(note.updated_at || note.lastModified);
              const dueDate = formatDate(note.due_date);
              const isNew = note.created_at
                ? new Date(note.created_at).getTime() > Date.now() - 86400000
                : false;

              const hasProjectContext = Boolean(note.project_name || note.stage_name);
              const priorityHex =
                note.priority_color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(note.priority_color)
                  ? note.priority_color
                  : null;
              const noteIcon = note.properties?.icon as ProjectProperties["icon"] | undefined;
              const tagItems =
                note.resolved_tags && note.resolved_tags.length > 0
                  ? note.resolved_tags
                  : (note.tags || []).map((name) => ({ id: name, name, color: "" }));

              const metaParts: React.ReactNode[] = [];
              if (note.priority_name) {
                metaParts.push(
                  <span
                    key="priority"
                    className="truncate font-normal"
                    style={{ color: priorityHex || undefined }}
                  >
                    {note.priority_name}
                  </span>
                );
              }
              if (dueDate) {
                metaParts.push(
                  <span key="due" className="inline-flex items-center gap-0.5 font-normal">
                    <Calendar className="h-2.5 w-2.5 shrink-0" />
                    {dueDate.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })}
                  </span>
                );
              }
              if (note.parent_id) {
                metaParts.push(
                  <span
                    key="subtask"
                    className="inline-flex items-center gap-0.5 font-normal text-violet-600 dark:text-violet-400"
                    title={t.home.carousel.subtask}
                  >
                    <GitBranch className="h-2.5 w-2.5" />
                    {t.home.carousel.subtask}
                  </span>
                );
              }
              tagItems.slice(0, 2).forEach((tag) => {
                const hex =
                  tag.color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(tag.color)
                    ? tag.color
                    : null;
                const fallback = getTagColor(tag.name);
                metaParts.push(
                  <span
                    key={tag.id}
                    className={`truncate font-normal ${hex ? "" : fallback.text}`}
                    style={hex ? { color: hex } : undefined}
                  >
                    {tag.name}
                  </span>
                );
              });

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => openModal("edit", { noteId: note.id })}
                  className="block w-[75vw] max-w-[220px] flex-shrink-0 snap-center text-left sm:w-[220px] sm:snap-start"
                >
                  <div
                    className={`group flex min-h-[148px] flex-col rounded-md border border-neutral-200 bg-neutral-50 p-2.5 font-normal transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md hover:shadow-neutral-200/50 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:hover:border-surface-dark-border-strong dark:hover:shadow-surface-dark-md ${note.done ? "opacity-90" : ""}`}
                  >
                    <div className="flex flex-1 flex-col">
                      <div className="mb-1.5 flex items-start justify-between gap-1.5">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {noteIcon ? (
                            <ProjectIcon
                              icon={noteIcon}
                              color={note.properties?.color}
                              size="xs"
                            />
                          ) : null}
                          <h2
                            className={`dark:group-hover:text-brand-primary-500 line-clamp-2 text-xs leading-tight font-normal text-neutral-900 transition-colors group-hover:text-yellow-600 dark:text-neutral-100 ${note.done ? "line-through opacity-80" : ""}`}
                          >
                            {note.title || t.common.untitled}
                          </h2>
                        </div>

                        <div className="flex flex-shrink-0 items-center gap-1">
                          {note.done && (
                            <span title={t.home.carousel.completed}>
                              <CircleCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
                            </span>
                          )}
                          {isNew && (
                            <span
                              className="bg-brand-primary-500 flex h-1.5 w-1.5 rounded-full"
                              title={t.home.carousel.newBadge}
                            />
                          )}
                        </div>
                      </div>

                      {metaParts.length > 0 && (
                        <p className="mb-1.5 flex flex-wrap items-center gap-x-1 text-[8px] text-neutral-600 dark:text-neutral-400">
                          {metaParts.map((part, index) => (
                            <React.Fragment key={index}>
                              {index > 0 && (
                                <span className="text-neutral-400 dark:text-neutral-500">·</span>
                              )}
                              {part}
                            </React.Fragment>
                          ))}
                        </p>
                      )}

                      <p className="mb-2 line-clamp-2 text-[10px] leading-relaxed font-normal text-neutral-500 dark:text-neutral-400">
                        {note.preview || t.home.carousel.noDescription}
                      </p>
                    </div>

                    <div className="mt-auto">
                      {hasProjectContext && (
                        <p className="mb-1 truncate text-[9px] font-normal text-neutral-500 dark:text-neutral-500">
                          {note.project_name}
                          {note.stage_name ? ` · ${note.stage_name}` : ""}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex -space-x-1.5">
                          <div
                            className="relative flex h-4 w-4 items-center justify-center overflow-hidden rounded-full"
                            title={note.owner_name || t.home.carousel.ownerTitle}
                          >
                            {note.owner_avatar_url ? (
                              <Image
                                src={note.owner_avatar_url}
                                alt={note.owner_name || t.home.carousel.ownerTitle}
                                width={16}
                                height={16}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[6px] font-normal text-yellow-600 dark:text-yellow-400">
                                {note.owner_name ? note.owner_name.charAt(0).toUpperCase() : "?"}
                              </span>
                            )}
                          </div>
                          {note.collaborators && note.collaborators.length > 0 && (
                            <>
                              {note.collaborators.slice(0, 3).map((c, i) => {
                                const avatar = getCollaboratorAvatarUrl(c);
                                const name = getCollaboratorDisplayName(c);
                                return (
                                  <div
                                    key={i}
                                    className="relative flex h-4 w-4 items-center justify-center overflow-hidden rounded-full"
                                    title={name}
                                  >
                                    {avatar ? (
                                      <Image
                                        src={avatar}
                                        alt={name}
                                        width={16}
                                        height={16}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[6px] font-normal text-neutral-500 dark:text-neutral-400">
                                        {name ? name.charAt(0).toUpperCase() : "?"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              {note.collaborators.length > 3 && (
                                <div className="relative flex h-4 w-4 items-center justify-center text-[6px] font-normal text-neutral-600 dark:text-neutral-400">
                                  +{note.collaborators.length - 3}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 text-[8px] font-normal text-neutral-700 dark:text-neutral-400">
                          <Calendar size={8} className="text-neutral-400" />
                          <span>
                            {t.home.carousel.updated}:{" "}
                            {validUpdated
                              ? validUpdated.toLocaleDateString(dateLocale, {
                                  day: "2-digit",
                                  month: "short",
                                  year: "2-digit",
                                })
                              : "--"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {notes.length > 1 && (
            <div className="mt-2 flex justify-center gap-1">
              {notes.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={`h-1 rounded-full transition-all ${
                    currentSlide === index
                      ? "bg-brand-primary-500 w-4"
                      : "w-1 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                  }`}
                  aria-label={t.home.carousel.goToNote.replace("{n}", String(index + 1))}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
