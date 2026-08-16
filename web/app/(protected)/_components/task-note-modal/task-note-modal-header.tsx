"use client";

import React from "react";
import {
  X,
  Loader2,
  Download,
  Trash2,
  Palette,
  MessageCircle,
  Plus,
  Maximize2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import type { Note } from "@/app/_contexts/notes-context";
import { getNotePath } from "@/app/_utils/note-path";
import type { TaskNoteModalMode } from "@/app/(protected)/_components/task-note-modal/use-task-note-modal";

const COLOR_PRESETS = [
  "#F6821F",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
];

interface TaskNoteModalHeaderProps {
  mode: TaskNoteModalMode;
  note: Note | null;
  isSaving: boolean;
  isExporting: boolean;
  showColorPicker: boolean;
  showCommentsPanel: boolean;
  onClose: () => void;
  onDelete: () => void;
  onExport: () => void;
  onToggleColorPicker: () => void;
  onColorChange: (color: string) => void;
  onToggleComments: () => void;
  onCreateNote?: () => void;
  createDisabled?: boolean;
  parentNoteId?: string;
  draftColor?: string;
  onDraftColorChange?: (color: string) => void;
  editingTitle?: string;
  onTitleChange?: (title: string) => void;
}

export function TaskNoteModalHeader({
  mode,
  note,
  isSaving,
  isExporting,
  showColorPicker,
  showCommentsPanel,
  onClose,
  onDelete,
  onExport,
  onToggleColorPicker,
  onColorChange,
  onToggleComments,
  onCreateNote,
  createDisabled = false,
  parentNoteId,
  draftColor,
  onDraftColorChange,
  editingTitle,
  onTitleChange,
}: TaskNoteModalHeaderProps) {
  const router = useRouter();
  const params = useParams();
  

  const handleOpenFullPage = () => {
    if (note) {
      onClose();
      router.push(getNotePath(note));
    }
  };

  const canEdit = mode === "edit" || mode === "create";
  const showActions = mode !== "create";

  return (
    <div className="dark:border-surface-dark-border flex-shrink-0 border-b border-neutral-200 bg-white px-4 py-3 dark:bg-[#1d1d1b]">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
          {editingTitle !== undefined && onTitleChange ? (
            <input
              id="task-note-modal-title"
              type="text"
              value={editingTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder={parentNoteId ? "Nova subtarefa..." : "Nova tarefa..."}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-neutral-800 placeholder-neutral-300 transition-colors outline-none focus:placeholder-neutral-400 dark:text-neutral-100 dark:placeholder-neutral-600 dark:focus:placeholder-neutral-500"
            />
          ) : (
            <h2
              id="task-note-modal-title"
              className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100"
            >
              {mode === "create"
                ? parentNoteId
                  ? "Nova subtarefa"
                  : "Nova tarefa"
                : mode === "edit"
                  ? "Editar Tarefa"
                  : "Visualizar Tarefa"}
            </h2>
          )}

          {isSaving && (
            <div className="flex items-center gap-1.5 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2.5 py-1">
              <Loader2 size={12} className="animate-spin text-yellow-600 dark:text-yellow-500" />
              <span className="text-[10px] font-semibold tracking-wider text-yellow-700 uppercase dark:text-yellow-500">
                Salvando
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showActions && note && (
            <>
              <button
                onClick={onToggleComments}
                className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                  showCommentsPanel
                    ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-500"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                }`}
                title="Comentários"
              >
                <MessageCircle size={15} />
              </button>

              <button
                onClick={handleOpenFullPage}
                className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                title="Abrir em página inteira"
              >
                <Maximize2 size={15} />
              </button>

              <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
            </>
          )}

          {showActions && canEdit && note && (
            <>
              <div className="relative">
                <button
                  onClick={onToggleColorPicker}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-yellow-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-yellow-500"
                  title="Cor"
                >
                  <Palette size={15} />
                </button>

                {showColorPicker && (
                  <div className="dark:border-surface-dark-border-strong absolute top-full right-0 z-20 mt-1 w-56 rounded-md border border-neutral-200 bg-white p-3 shadow-xl dark:bg-[#1d1d1b]">
                    <div className="mb-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                      Escolha uma cor
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          onClick={() => onColorChange(c)}
                          className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${
                            note?.properties?.color === c
                              ? "border-neutral-900 dark:border-white"
                              : "border-transparent hover:border-neutral-400 dark:hover:border-neutral-500"
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <div className="dark:border-surface-dark-border mt-2.5 border-t border-neutral-100 pt-2.5">
                      <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        Cor personalizada
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={note?.properties?.color || "#F6821F"}
                          onChange={(e) => onColorChange(e.target.value)}
                          className="dark:border-surface-dark-border-strong h-8 w-8 cursor-pointer rounded border border-neutral-200 bg-transparent p-0.5"
                          title="Escolher cor"
                        />
                        <div className="relative flex-1">
                          <span className="absolute top-1/2 left-2 -translate-y-1/2 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                            #
                          </span>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="HEX"
                            defaultValue={(note?.properties?.color || "").replace("#", "")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (/^[0-9A-Fa-f]{3,6}$/.test(val)) onColorChange(`#${val}`);
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (/^[0-9A-Fa-f]{3,6}$/.test(val)) onColorChange(`#${val}`);
                            }}
                            className="dark:border-surface-dark-border-strong w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pr-2 pl-5 font-mono text-xs text-neutral-700 uppercase placeholder-neutral-400 outline-none focus:border-yellow-500 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={onExport}
                disabled={isExporting}
                className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-yellow-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-yellow-500"
                title="Exportar PDF"
              >
                {isExporting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}
              </button>

              {note.access?.canDelete && (
                <button
                  onClick={onDelete}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500 dark:text-neutral-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  title="Deletar tarefa"
                >
                  <Trash2 size={15} />
                </button>
              )}

              <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
            </>
          )}

          {mode === "create" && onCreateNote && (
            <>
              {onDraftColorChange && (
                <div className="relative">
                  <button
                    onClick={onToggleColorPicker}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-yellow-600 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-yellow-500"
                    title="Cor"
                  >
                    <Palette size={15} />
                  </button>
                  {showColorPicker && (
                    <div className="dark:border-surface-dark-border-strong absolute top-full right-0 z-20 mt-1 w-56 rounded-md border border-neutral-200 bg-white p-3 shadow-xl dark:bg-[#1d1d1b]">
                      <div className="mb-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                        Escolha uma cor
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              onDraftColorChange(c);
                              if (showColorPicker) onToggleColorPicker();
                            }}
                            className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${
                              draftColor === c
                                ? "border-neutral-900 dark:border-white"
                                : "border-transparent hover:border-neutral-400 dark:hover:border-neutral-500"
                            }`}
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={onCreateNote}
                disabled={isSaving || createDisabled}
                title="Criar tarefa"
                aria-label="Criar tarefa"
                className="flex items-center gap-1.5 rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Criar
              </button>
              <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
            </>
          )}

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
