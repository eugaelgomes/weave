"use client";

import { CheckSquare, Link, Search, X } from "lucide-react";

import { type Note, type NoteOverview } from "@/app/_contexts/notes-context";
import { getTagColor } from "@/app/_utils/tag-colors";
import { ProjectIcon } from "@/app/(protected)/[orgId]/projects/_components/project-icon";

interface NoteRelationsModalProps {
  filteredRelationNotes: NoteOverview[];
  isOpen: boolean;
  note: Note | null;
  onClose: () => void;
  onRelationSearchTermChange: (value: string) => void;
  onToggleRelation: (relatedNoteId: string) => void;
  relationSearchTerm: string;
}

export function NoteRelationsModal({
  filteredRelationNotes,
  isOpen,
  note,
  onClose,
  onRelationSearchTermChange,
  onToggleRelation,
  relationSearchTerm,
}: NoteRelationsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 dark:border-surface-dark-border-strong w-full max-w-md rounded-t-xl border border-neutral-200 bg-white p-5 shadow-2xl duration-200 sm:rounded-md sm:p-6 dark:bg-[#1d1d1b]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 sm:hidden dark:bg-neutral-600" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-neutral-900 sm:text-lg dark:text-neutral-100">
            <div className="dark:bg-brand-primary-500/10 flex h-8 w-8 items-center justify-center rounded-md bg-yellow-50">
              <Link size={16} className="dark:text-brand-primary-500 text-yellow-600" />
            </div>
            Relações
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Buscar tarefas
            </label>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                size={15}
              />
              <input
                type="text"
                value={relationSearchTerm}
                onChange={(e) => onRelationSearchTermChange(e.target.value)}
                placeholder="Pesquisar por título..."
                className="dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 py-3 pr-4 pl-10 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none sm:py-2.5 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 space-y-1 overflow-y-auto sm:max-h-52">
            {filteredRelationNotes.length > 0 ? (
              filteredRelationNotes.map((relNote) => {
                const isSelected = (note?.properties?.relations || []).includes(relNote.id);
                return (
                  <button
                    key={relNote.id}
                    onClick={() => onToggleRelation(relNote.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors sm:py-2 ${
                      isSelected
                        ? "dark:bg-brand-primary-500/10 bg-yellow-50 ring-1 ring-yellow-200 dark:ring-yellow-500/30"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                        isSelected
                          ? "bg-brand-primary-500 border-yellow-500 text-white"
                          : "dark:border-surface-dark-border-muted border-neutral-300"
                      }`}
                    >
                      {isSelected ? <CheckSquare size={10} /> : null}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <ProjectIcon
                        icon={relNote.properties?.icon}
                        color={relNote.properties?.color}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {relNote.title || "Tarefa sem título"}
                        </div>
                        {relNote.tags && relNote.tags.length > 0 ? (
                          <div className="mt-0.5 flex gap-1 overflow-hidden">
                            {relNote.tags.slice(0, 2).map((tag) => {
                              const colors = getTagColor(tag);
                              return (
                                <span
                                  key={tag}
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                                >
                                  {tag}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-6 text-center text-sm text-neutral-400 dark:text-neutral-500">
                {relationSearchTerm ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa disponível"}
              </div>
            )}
          </div>

          <div className="dark:border-surface-dark-border flex justify-end border-t border-neutral-100 pt-4">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 sm:py-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
