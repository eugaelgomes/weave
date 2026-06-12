"use client";

import { Plus, Tag, X } from "lucide-react";

import { type Note } from "@/app/_contexts/notes-context";
import { getTagColor } from "@/app/_utils/tag-colors";

interface NoteTagsModalProps {
  isOpen: boolean;
  newTag: string;
  note: Note | null;
  onAddTag: () => void;
  onClose: () => void;
  onNewTagChange: (value: string) => void;
  onRemoveTag: (tagToRemove: string) => void;
}

export function NoteTagsModal({
  isOpen,
  newTag,
  note,
  onAddTag,
  onClose,
  onNewTagChange,
  onRemoveTag,
}: NoteTagsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 dark:border-surface-dark-border-strong w-full max-w-md rounded-t-xl border border-neutral-200 bg-white p-5 shadow-2xl duration-200 sm:rounded-md sm:p-6 dark:bg-[#1d1d1b]">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-300 sm:hidden dark:bg-neutral-600" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2.5 text-base font-semibold text-neutral-900 sm:text-lg dark:text-neutral-100">
            <div className="dark:bg-brand-primary-500/10 flex h-8 w-8 items-center justify-center rounded-md bg-yellow-50">
              <Tag size={16} className="dark:text-brand-primary-500 text-yellow-600" />
            </div>
            Gerenciar Tags
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
              Nova tag
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={newTag}
                onChange={(e) => onNewTagChange(e.target.value)}
                placeholder="Digite o nome da tag..."
                className="dark:border-surface-dark-border-strong flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none sm:py-2.5 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddTag();
                  }
                }}
              />
              <button
                onClick={onAddTag}
                disabled={!newTag.trim()}
                className="bg-brand-primary-500 flex items-center justify-center gap-1.5 rounded-md px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5 dark:bg-neutral-50 dark:text-neutral-950 dark:hover:bg-neutral-200"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>
          </div>

          {note?.tags && note.tags.length > 0 ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Tags existentes
              </label>
              <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                {note.tags.map((tag, index) => {
                  const colors = getTagColor(tag);
                  return (
                    <span
                      key={index}
                      className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${colors.bg} ${colors.text} ${colors.border}`}
                    >
                      {tag}
                      <button
                        onClick={() => onRemoveTag(tag)}
                        className="text-neutral-400 transition-colors hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
                        title="Remover tag"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

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
