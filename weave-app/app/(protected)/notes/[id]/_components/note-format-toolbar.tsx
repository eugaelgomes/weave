"use client";

import React from "react";
import { Bold, Code, Italic, Link2, Strikethrough } from "lucide-react";
import clsx from "clsx";

export interface MarkdownToolbarActions {
  wrap: (before: string, after: string) => void;
  insertLink: () => void;
}

interface NoteFormatToolbarProps {
  actions: MarkdownToolbarActions;
  className?: string;
}

/**
 * Atalhos para sintaxe Markdown (negrito, itálico, código, link…).
 * O estado do texto fica no componente pai.
 */
export function NoteFormatToolbar({ actions, className }: NoteFormatToolbarProps) {
  const btn =
    "rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100";

  return (
    <div
      className={clsx(
        "mb-1 flex flex-wrap items-center gap-0.5 rounded-lg border border-neutral-200/80 bg-neutral-50/90 px-1 py-0.5 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]/60",
        className
      )}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button type="button" className={btn} title="Negrito (**)" onClick={() => actions.wrap("**", "**")}>
        <Bold size={15} strokeWidth={2.25} />
      </button>
      <button type="button" className={btn} title="Itálico (*)" onClick={() => actions.wrap("*", "*")}>
        <Italic size={15} strokeWidth={2.25} />
      </button>
      <button type="button" className={btn} title="Riscado (~~)" onClick={() => actions.wrap("~~", "~~")}>
        <Strikethrough size={15} strokeWidth={2.25} />
      </button>
      <button type="button" className={btn} title="Código (`)" onClick={() => actions.wrap("`", "`")}>
        <Code size={15} strokeWidth={2.25} />
      </button>
      <button type="button" className={btn} title="Link [texto](url)" onClick={() => actions.insertLink()}>
        <Link2 size={15} strokeWidth={2.25} />
      </button>
    </div>
  );
}
