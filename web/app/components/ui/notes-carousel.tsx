"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FileText, ChevronLeft, ChevronRight, Calendar, Users } from "lucide-react";

// Tente importar do seu projeto. Se der erro, use as funções fallback abaixo.
import {
  getCollaboratorDisplayName,
  getCollaboratorAvatarUrl,
  type CollaboratorObject,
} from "@/app/utils/collaborators";

import { getTagColor } from "@/app/utils/tag-colors";

/* // --- FALLBACKS (Descomente se não tiver os utils acima) ---
const getCollaboratorDisplayName = (c: any) => c.name || c.username || "Usuário";
const getCollaboratorAvatarUrl = (c: any) => c.avatar_url || null; 
*/

// =================== INTERFACES ===================

// Colaboradores podem vir como strings (user_id) ou objetos expandidos
type Collaborator = string | CollaboratorObject;

interface Note {
  id: string;
  title: string;
  description?: string;
  preview?: string;
  tags?: string[];
  collaborators?: Collaborator[];
  created_at?: string; // Tornando opcional para evitar quebras
  updated_at?: string;
}

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
    <div className="rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header do Carrossel */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-yellow-500 sm:text-lg dark:text-neutral-100">
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
              const validDate = formatDate(note.updated_at || note.created_at);
              const isNew = note.created_at
                ? new Date(note.created_at).getTime() > Date.now() - 86400000
                : false;

              return (
                <Link
                  key={note.id}
                  href={`/app/notes/view/${note.id}`}
                  className="block w-[85vw] max-w-[320px] flex-shrink-0 snap-center sm:w-[320px] sm:snap-start"
                >
                  <div className="group flex h-[280px] flex-col justify-between rounded-md border border-neutral-200 bg-white p-5 transition-all duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-200/50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 dark:hover:shadow-neutral-900/50">
                    {/* Topo: Título e Badge */}
                    <div>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-base leading-tight font-semibold text-neutral-900 transition-colors group-hover:text-yellow-600 dark:text-neutral-100 dark:group-hover:text-yellow-500">
                          {note.title || "Nota sem título"}
                        </h3>
                        {isNew && (
                          <span
                            className="flex h-2 w-2 flex-shrink-0 rounded-md bg-yellow-500 shadow-sm"
                            title="Nova"
                          />
                        )}
                      </div>

                      {/* Descrição */}
                      <div className="mb-4">
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
                        {note.collaborators && note.collaborators.length > 0 ? (
                          <div className="flex -space-x-2">
                            {note.collaborators.slice(0, 3).map((c, i) => {
                              const avatar = getCollaboratorAvatarUrl(c);
                              const name = getCollaboratorDisplayName(c);
                              return (
                                <div
                                  key={i}
                                  className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-md border-2 border-white bg-neutral-100 ring-1 ring-neutral-100 dark:border-neutral-950 dark:bg-neutral-800 dark:ring-neutral-900"
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
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 dark:text-neutral-600">
                            <Users size={12} />
                            <span>Sem colaboradores</span>
                          </div>
                        )}

                        {/* Data e Hora */}
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                            <Calendar size={10} className="text-neutral-400" />
                            <span>
                              {validDate
                                ? validDate.toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : "--"}
                            </span>
                          </div>
                          <span className="text-[9px] text-neutral-400 dark:text-neutral-600">
                            {validDate
                              ? validDate.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
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
