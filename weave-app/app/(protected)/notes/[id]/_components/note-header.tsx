"use client";

import { ArrowLeft, Download, Loader2, Palette, Share2, Trash2 } from "lucide-react";

import { type Note } from "@/app/_contexts/notes-context";

interface NoteDetailHeaderProps {
  isExporting: boolean;
  isSaving: boolean;
  note: Note;
  onBack: () => void;
  onChangeColor: (color: string) => void;
  onDelete: () => void;
  onExport: () => void;
  onShare: () => void;
  onToggleColorPicker: () => void;
  setShowColorPicker: (show: boolean) => void;
  showColorPicker: boolean;
}

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

export function NoteDetailHeader({
  isExporting,
  isSaving,
  note,
  onBack,
  onChangeColor,
  onDelete,
  onExport,
  onShare,
  onToggleColorPicker,
  setShowColorPicker,
  showColorPicker,
}: NoteDetailHeaderProps) {
  return (
    <div className="flex-shrink-0 border-b border-neutral-200 bg-neutral-50 px-1.5 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex w-full items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm font-medium text-neutral-600 transition-all hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          title="Go back to notes list"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-1.5">
          {isSaving ? (
            <>
              <div className="flex items-center gap-2">
                <div className="bg-brand-primary-500/10 flex animate-pulse items-center gap-1.5 rounded-full border border-yellow-500/20 px-2.5 py-1">
                  <Loader2
                    size={13}
                    className="dark:text-brand-primary-500 animate-spin text-yellow-600"
                  />
                  <span className="dark:text-brand-primary-500 text-[11px] font-semibold tracking-wider text-yellow-700 uppercase">
                    Sincronizando
                  </span>
                </div>
              </div>
              <div className="mx-0.5 hidden h-4 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />
            </>
          ) : null}

          <div className="flex items-center gap-0.5">
            {note.access?.canShare ? (
              <button
                onClick={onShare}
                className="dark:hover:text-brand-primary-500 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-yellow-600 dark:text-neutral-400 dark:hover:bg-neutral-800"
                title="Compartilhar tarefa"
              >
                <Share2 size={15} />
              </button>
            ) : null}

            {note.access?.canDelete ? (
              <button
                onClick={onDelete}
                className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-all hover:bg-red-50 hover:text-red-500 dark:text-neutral-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                title="Deletar tarefa"
              >
                <Trash2 size={15} />
              </button>
            ) : null}
          </div>

          <div className="mx-0.5 hidden h-4 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />

          <div className="relative flex">
            <button
              onClick={onToggleColorPicker}
              className="dark:hover:text-brand-primary-500 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-yellow-600 dark:text-neutral-400 dark:hover:bg-neutral-800"
              title="Adicionar cor"
            >
              <Palette size={15} />
            </button>
            {showColorPicker ? (
              <div className="absolute top-full right-0 z-20 mt-1 w-56 rounded-md border border-neutral-200 bg-white p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
                <div className="mb-2 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  Escolha uma cor
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onChangeColor(c)}
                      className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${
                        note.properties?.color === c
                          ? "border-neutral-900 dark:border-white"
                          : "border-transparent hover:border-neutral-400 dark:hover:border-neutral-500"
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="mt-2.5 border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
                  <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                    Cor personalizada
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={note.properties?.color || "#F6821F"}
                      onChange={(e) => onChangeColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-neutral-200 bg-transparent p-0.5 dark:border-neutral-700"
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
                        defaultValue={(note.properties?.color || "").replace("#", "")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (/^[0-9A-Fa-f]{3,6}$/.test(val)) onChangeColor(`#${val}`);
                          }
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (/^[0-9A-Fa-f]{3,6}$/.test(val)) onChangeColor(`#${val}`);
                        }}
                        className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-1.5 pr-2 pl-5 font-mono text-xs text-neutral-700 uppercase placeholder-neutral-400 outline-none focus:border-yellow-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-500 dark:focus:border-yellow-500/50"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowColorPicker(false)}
                  className="mt-2 w-full rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
                >
                  Fechar
                </button>
              </div>
            ) : null}
            <button
              onClick={onExport}
              disabled={isExporting}
              className="dark:hover:text-brand-primary-500 flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-all hover:bg-neutral-100 hover:text-yellow-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-800"
              title="Exportar tarefa"
            >
              {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}