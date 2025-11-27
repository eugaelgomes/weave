"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useNotes } from "../../contexts/NotesContext";
import { FileText, Tag, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";

export default function HomePage() {
  const { authenticated, loading, user } = useAuth();
  const { getNotesStats, getRecentNotes } = useNotes();
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);

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

  const inspirationQuotes = [
    "Mantenha-se em foco!",
    "Acredito no seu potencial!",
    "Rotina e disciplina são a chave!",
  ];

  const stats = getNotesStats();
  const recentNotes = getRecentNotes();
  const userName = String(user?.name || user?.username || "usuário");

  // Controle do carrossel
  const scrollToSlide = (index: number) => {
    if (carouselRef.current) {
      const cardWidth = carouselRef.current.scrollWidth / recentNotes.length;
      carouselRef.current.scrollTo({
        left: cardWidth * index,
        behavior: "smooth",
      });
      setCurrentSlide(index);
    }
  };

  const nextSlide = () => {
    if (currentSlide < recentNotes.length - 1) {
      scrollToSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      scrollToSlide(currentSlide - 1);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2">
          <h3 className="text-md mb-1 tracking-tight text-neutral-100">
            Olá, {userName} {"ツ"}
          </h3>
          <span className="text-sm text-neutral-400">{userCurrentDateTime}</span>
          <p className="text-xs leading-relaxed text-neutral-400">
            {inspirationQuotes[Math.floor(Math.random() * inspirationQuotes.length)]}
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              icon: <FileText className="h-4 w-4 text-neutral-300" />,
              label: "Total de Notas",
              value: stats?.totalNotes ?? 0,
            },
            {
              icon: <Tag className="h-4 w-4 text-neutral-300" />,
              label: "Tags Únicas",
              value: stats?.totalTags ?? 0,
            },
            {
              icon: <TrendingUp className="h-4 w-4 text-neutral-300" />,
              label: "Status Completo",
              value: stats?.statusDistribution?.completed ?? 0,
            },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 transition-colors hover:bg-neutral-900/80"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-md bg-neutral-800 p-1.5">{item.icon}</div>
                <h4 className="text-xs font-medium text-neutral-400">{item.label}</h4>
              </div>
              <p className="text-2xl font-bold tracking-tight text-neutral-100">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Tags mais usadas */}
        {stats?.mostUsedTags && stats.mostUsedTags.length > 0 && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="mb-3 text-base font-semibold text-neutral-100">Tags Mais Usadas</h3>
            <div className="flex flex-wrap gap-2">
              {stats.mostUsedTags.map((tagInfo, index) => (
                <div
                  key={index}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:bg-neutral-800/70"
                >
                  <span>{tagInfo.tag}</span>
                  <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400">
                    {tagInfo.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas Recentes - Carrossel */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-100">Notas Recentes</h3>
            {recentNotes.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="rounded-lg bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={nextSlide}
                  disabled={currentSlide === recentNotes.length - 1}
                  className="rounded-lg bg-neutral-800 p-2 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Próxima"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {recentNotes.length === 0 ? (
            <div className="py-8 text-center text-neutral-400">
              <FileText className="mx-auto mb-2 h-10 w-10 text-neutral-600" />
              <p className="mb-1 text-base font-medium text-neutral-200">
                Você ainda não tem notas
              </p>
              <p className="mb-4 text-sm text-neutral-500">Que tal criar sua primeira nota?</p>
              <Link
                href="/app/notes"
                className="inline-flex items-center gap-2 rounded-md bg-yellow-500 px-3 py-1.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-yellow-600"
              >
                <FileText className="h-4 w-4" />
                Criar Primeira Nota
              </Link>
            </div>
          ) : (
            <div className="relative">
              <div
                ref={carouselRef}
                className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth sm:gap-4"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/app/notes/view/${note.id}`}
                    className="block max-w-[320px] flex-shrink-0 sm:max-w-[320px]"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className="group flex h-[260px] flex-col rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900 sm:h-[260px] sm:p-5">
                      {/* Cabeçalho: data + tags */}
                      <div className="mb-3 flex flex-shrink-0 flex-col gap-2">
                        {/* Data */}
                        {note.lastModified && (
                          <span className="text-xs font-medium text-neutral-500">
                            {new Date(note.lastModified).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}

                        {/* Tags */}
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {note.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2.5 py-1 text-[10px] font-medium text-yellow-400 sm:text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 2 && (
                              <span className="rounded-full bg-neutral-800 px-2 py-1 text-[10px] text-neutral-500 sm:text-xs">
                                +{note.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Título */}
                      <h3 className="mb-3 line-clamp-2 flex-shrink-0 text-sm leading-tight font-semibold text-white transition-colors group-hover:text-yellow-400 sm:text-base lg:text-lg">
                        {note.title || "Nota sem título"}
                      </h3>

                      {/* Descrição - ocupa espaço flexível */}
                      <div className="mb-4 flex-1">
                        {note.preview && (
                          <p className="line-clamp-4 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                            {note.preview.length > 120
                              ? note.preview.substring(0, 120) + "..."
                              : note.preview}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Indicadores de slides */}
              {recentNotes.length > 1 && (
                <div className="mt-4 flex justify-center gap-2">
                  {recentNotes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        currentSlide === index
                          ? "w-8 bg-yellow-500"
                          : "w-2 bg-neutral-700 hover:bg-neutral-600"
                      }`}
                      aria-label={`Ir para nota ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
