"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

import { getCollaboratorDisplayName, getCollaboratorAvatarUrl } from "@/app/_utils/collaborators";

import { getTagColor } from "@/app/_utils/tag-colors";
import getStorageUrl from "@/app/_utils/get-storage-url";

import type { Note } from "@/app/_services/notes-service/notes-service";

// =================== INTERFACES ===================

interface NotesCarouselProps {
  notes: Note[];
  title?: string;
  emptyMessage?: string;
  emptyActionText?: string;
  emptyActionHref?: string;
}

// =================== UTILS DE DATA ===================

const formatDate = (dateString?: string) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  // Verifica se a data é válida
  if (isNaN(date.getTime())) return null;
  return date;
};

// =================== COMPONENT ===================

export default function NotesCarousel({
  notes,
  title = "Notas Recentes",
  emptyMessage = "Você ainda não tem notas",
  emptyActionText = "Criar Primeira Nota",
  emptyActionHref = "/app/notes",
}: NotesCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToSlide = (index: number) => {
    if (carouselRef.current && notes.length > 0) {
      const cardWidth = 320 + 16; // Largura do card + gap aproximado
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
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 shadow-md dark:border-neutral-800 dark:bg-neutral-950">
      {/* Header do Carrossel */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="sm:text-md text-base font-semibold text-neutral-500 dark:text-neutral-100">
          {title}
        </h3>
        {notes.length > 1 && (
          <div className="flex gap-2">
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
              disabled={currentSlide === notes.length - 1}
              className="rounded-md bg-neutral-100 p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-30 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
            <FileText className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
          </div>
          <p className="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {emptyMessage}
          </p>
          <Link
            href={emptyActionHref}
            className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600"
          >
            <FileText className="h-4 w-4" /> {emptyActionText}
          </Link>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={carouselRef}
            className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1"
          >
            {notes.map((note) => {
              const validDate = formatDate(note.updated_at || note.lastModified);
              const isNew = note.created_at
                ? new Date(note.created_at).getTime() > Date.now() - 86400000
                : false;

              // Verificação segura se a nota possui ícone e cor válidos
              const hasIcon = Boolean(note.properties?.icon?.path);
              const hasColor = Boolean(note.properties?.color);
              const baseColor =
                hasColor && note.properties?.color?.startsWith("#") ? note.properties.color : null;

              return (
                <Link
                  key={note.id}
                  href={`/app/notes/${note.id}`}
                  className="block w-[85vw] max-w-[320px] flex-shrink-0 snap-center sm:w-[320px] sm:snap-start"
                >
                  <div
                    // As classes do Tailwind continuam sempre no className
                    className="group flex h-[280px] flex-col justify-between rounded-md border border-neutral-200 bg-neutral-50 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:shadow-neutral-900/50"
                    // O style recebe as propriedades dinâmicas ou 'undefined' para fallback limpo
                    style={{
                      // Se tiver cor, aplica as variações. Se não, usa o padrão do Tailwind
                      backgroundColor: baseColor ? `${baseColor}40` : undefined,
                      boxShadow: baseColor ? `0 4px 14px 0 ${baseColor}15` : undefined,
                    }}
                  >
                    {/* Topo: Ícone, Título e Badge */}
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {hasIcon && (
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-sm">
                              <Image
                                src={getStorageUrl(note.properties!.icon!.path)}
                                alt={`Ícone de ${note.title}`}
                                width={32}
                                height={32}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <h2 className="line-clamp-2 text-base leading-tight text-neutral-900 transition-colors group-hover:text-yellow-600 dark:text-neutral-100 dark:group-hover:text-yellow-500">
                            {note.title || "Nota sem título"}
                          </h2>
                        </div>

                        {isNew && (
                          <span
                            className="flex h-2 w-2 flex-shrink-0 rounded-md bg-yellow-500 shadow-sm"
                            title="Nova"
                          />
                        )}
                      </div>

                      {/* Descrição */}
                      <div className="mt-3 mb-4">
                        <p className="line-clamp-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                          {note.preview || note.description || "Sem descrição..."}
                        </p>
                      </div>
                    </div>

                    {/* Rodapé: Tags, Colaboradores e Data */}
                    <div>
                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {note.tags.slice(0, 3).map((tag, i) => {
                            const colors = getTagColor(tag);
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                              >
                                {tag}
                              </span>
                            );
                          })}
                          {(note.tags?.length || 0) > 3 && (
                            <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                              +{note.tags!.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Linha divisória + Colaboradores e Data */}
                      <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-900">
                        {/* Colaboradores */}
                        <div className="flex -space-x-2">
                          {/* Avatar do dono da nota */}
                          <div
                            className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-1 border-neutral-900 bg-neutral-100 dark:border-neutral-200 dark:bg-neutral-800"
                            title={note.owner_name || "Dono"}
                          >
                            {note.owner_avatar_url ? (
                              <Image
                                src={note.owner_avatar_url}
                                alt={note.owner_name || "Dono"}
                                width={24}
                                height={24}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[8px] font-bold text-yellow-600 dark:text-yellow-400">
                                {note.owner_name ? note.owner_name.charAt(0).toUpperCase() : "?"}
                              </span>
                            )}
                          </div>
                          {/* Colaboradores adicionais */}
                          {note.collaborators && note.collaborators.length > 0 && (
                            <>
                              {note.collaborators.slice(0, 3).map((c, i) => {
                                const avatar = getCollaboratorAvatarUrl(c);
                                const name = getCollaboratorDisplayName(c);
                                return (
                                  <div
                                    key={i}
                                    className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-1 border-neutral-900 bg-neutral-100 dark:border-neutral-950 dark:bg-neutral-800 dark:ring-neutral-900"
                                    title={name}
                                  >
                                    {avatar ? (
                                      <Image
                                        src={avatar}
                                        alt={name}
                                        width={24}
                                        height={24}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[8px] font-bold text-neutral-500 dark:text-neutral-400">
                                        {name ? name.charAt(0).toUpperCase() : "?"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                              {note.collaborators.length > 3 && (
                                <div className="relative flex h-6 w-6 items-center justify-center rounded-md border-2 border-white bg-neutral-200 text-[8px] font-bold text-neutral-600 dark:border-neutral-950 dark:bg-neutral-800 dark:text-neutral-400">
                                  +{note.collaborators.length - 3}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Data e Hora */}
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                            <Calendar size={10} className="text-neutral-400" />
                            <span>
                              {validDate
                                ? validDate.toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "--"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Indicadores de Slide */}
          {notes.length > 1 && (
            <div className="mt-4 flex justify-center gap-1.5">
              {notes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToSlide(index)}
                  className={`h-1.5 rounded-md transition-all ${
                    currentSlide === index
                      ? "w-6 bg-yellow-500"
                      : "w-1.5 bg-neutral-300 hover:bg-neutral-400 dark:bg-neutral-700 dark:hover:bg-neutral-600"
                  }`}
                  aria-label={`Ir para nota ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
