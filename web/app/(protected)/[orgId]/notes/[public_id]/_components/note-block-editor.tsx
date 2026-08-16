"use client";

import React, { useCallback, useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import clsx from "clsx";

import type { Block } from "@/app/_contexts/notes-context";
import getStorageUrl from "@/app/_utils/get-storage-url";
import {
  NoteRichContent,
  type ContentMark,
} from "@/app/(protected)/[orgId]/notes/[public_id]/_components/note-rich-content";
import {
  NoteFormatToolbar,
  type MarkdownToolbarActions,
} from "@/app/(protected)/[orgId]/notes/[public_id]/_components/note-format-toolbar";
import { useAutoResizeTextarea } from "@/app/(protected)/[orgId]/notes/[public_id]/_hooks/use-auto-resize-textarea";

export interface NoteBlockEditorProps {
  block: Block & { children?: Block[] };
  noteId: string;
  onUpdate: (blockId: string, data: Partial<Block>) => Promise<void>;
  onFlushRequest?: (blockId: string) => void;
  coalescedTextSave?: boolean;
  onPasteLines?: (blockId: string, lines: string[]) => Promise<void>;
  onAddBlockAfter: (afterBlockId: string) => void;
  onBackspaceEmpty?: (blockId: string) => void;
  focusBlockId?: string | null;
  onFocused?: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  canEdit?: boolean;
}

function getPlainText(block: Block): string {
  if (typeof block.text === "string") return block.text;
  const p = block.properties as Record<string, unknown> | undefined;
  if (p && typeof p.text === "string") return p.text;
  return "";
}

function getMarks(block: Block): ContentMark[] | undefined {
  const p = block.properties as Record<string, unknown> | undefined;
  const m = p?.marks;
  if (!Array.isArray(m) || m.length === 0) return undefined;
  return m as ContentMark[];
}

function getAttrs(block: Block): Record<string, unknown> {
  const p = block.properties as Record<string, unknown> | undefined;
  const a = p?.attrs;
  if (a && typeof a === "object" && !Array.isArray(a)) return a as Record<string, unknown>;
  return {};
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50",
  2: "text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50",
  3: "text-xl font-semibold text-neutral-900 dark:text-neutral-100",
  4: "text-lg font-semibold text-neutral-900 dark:text-neutral-100",
  5: "text-base font-semibold text-neutral-900 dark:text-neutral-100",
  6: "text-sm font-semibold uppercase tracking-wide text-neutral-800 dark:text-neutral-200",
};

function headingLevel(block: Block): number {
  const attrs = getAttrs(block);
  const raw =
    typeof attrs.level === "number"
      ? attrs.level
      : typeof (block.properties as Record<string, unknown>)?.level === "number"
        ? Number((block.properties as Record<string, unknown>).level)
        : 2;
  return Math.min(6, Math.max(1, Number.isFinite(raw) ? raw : 2));
}

function HeadingElement({
  level,
  className,
  children,
}: {
  level: number;
  className: string;
  children: React.ReactNode;
}) {
  const l = Math.min(6, Math.max(1, level));
  switch (l) {
    case 1:
      return <h1 className={className}>{children}</h1>;
    case 2:
      return <h2 className={className}>{children}</h2>;
    case 3:
      return <h3 className={className}>{children}</h3>;
    case 4:
      return <h4 className={className}>{children}</h4>;
    case 5:
      return <h5 className={className}>{children}</h5>;
    default:
      return <h6 className={className}>{children}</h6>;
  }
}

function insertLinkPrompt(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  localText: string,
  setLocalText: (v: string) => void
) {
  const el = textareaRef.current;
  if (!el) return;
  const url = window.prompt("URL do link:", "https://");
  if (url === null || !url.trim()) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = localText.slice(start, end).trim() || "texto";
  const insert = `[${selected}](${url.trim()})`;
  const next = localText.slice(0, start) + insert + localText.slice(end);
  setLocalText(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + insert.length;
    el.setSelectionRange(pos, pos);
  });
}

function DragHandle({ dragHandleProps }: { dragHandleProps?: Record<string, unknown> }) {
  return (
    <div className="absolute top-1.5 -left-7 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        {...dragHandleProps}
        type="button"
        className="hover:text-brand-primary-500 dark:hover:text-brand-primary-500 cursor-grab rounded p-0.5 text-neutral-300 hover:bg-neutral-100/80 active:cursor-grabbing dark:text-neutral-600 dark:hover:bg-neutral-800/70"
        title="Arrastar para reordenar"
        aria-label="Arrastar bloco"
      >
        <GripVertical size={14} />
      </button>
    </div>
  );
}

export function NoteBlockEditor({
  block,
  onUpdate,
  onFlushRequest,
  coalescedTextSave = true,
  onPasteLines,
  onAddBlockAfter,
  onBackspaceEmpty,
  focusBlockId,
  onFocused,
  isDragging,
  dragHandleProps,
  canEdit = true,
}: NoteBlockEditorProps) {
  const plainSource = getPlainText(block);
  const marks = getMarks(block);
  const attrs = getAttrs(block);

  const [localText, setLocalText] = useState(plainSource);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useAutoResizeTextarea(localText);

  const prevPlain = React.useRef(plainSource);
  useEffect(() => {
    if (plainSource === prevPlain.current) return;
    const previousPlain = prevPlain.current;
    prevPlain.current = plainSource;

    const hasLocalDraft = localText !== previousPlain;
    const shouldPreserveLocalDraft = isFocused || (coalescedTextSave && hasLocalDraft);

    if (shouldPreserveLocalDraft) return;
    setLocalText(plainSource);
  }, [plainSource, localText, isFocused, coalescedTextSave]);

  useEffect(() => {
    if (focusBlockId === block.id && textareaRef.current && canEdit) {
      textareaRef.current.focus();
      setIsFocused(true);
      onFocused?.();
    }
  }, [focusBlockId, block.id, onFocused, textareaRef, canEdit]);

  useEffect(() => {
    if (coalescedTextSave) return;
    if (localText === plainSource) return;
    const timeoutId = window.setTimeout(() => {
      void onUpdate(block.id, { text: localText });
    }, 1800);
    return () => clearTimeout(timeoutId);
  }, [coalescedTextSave, localText, plainSource, onUpdate, block.id]);

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = localText;
      const selected = val.slice(start, end);
      const next = val.slice(0, start) + before + selected + after + val.slice(end);
      setLocalText(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + before.length, start + before.length + selected.length);
      });
    },
    [localText, textareaRef]
  );

  const markdownActions: MarkdownToolbarActions = {
    wrap: wrapSelection,
    insertLink: () => insertLinkPrompt(textareaRef, localText, setLocalText),
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const multiLineTypes = new Set(["code", "table"]);
    const breakOnEnter = !multiLineTypes.has(block.type);

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrapSelection("**", "**");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
      e.preventDefault();
      wrapSelection("*", "*");
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && breakOnEnter) {
      e.preventDefault();
      onFlushRequest?.(block.id);
      onAddBlockAfter(block.id);
    }

    if (e.key === "Backspace" && localText === "" && onBackspaceEmpty) {
      e.preventDefault();
      onBackspaceEmpty(block.id);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPasteLines) return;
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText || !pastedText.includes("\n")) return;

    e.preventDefault();
    const textarea = e.currentTarget;
    const selectionStart = textarea.selectionStart ?? localText.length;
    const selectionEnd = textarea.selectionEnd ?? localText.length;
    const beforeSelection = localText.slice(0, selectionStart);
    const afterSelection = localText.slice(selectionEnd);
    const merged = `${beforeSelection}${pastedText.replace(/\r\n/g, "\n")}${afterSelection}`;
    const [firstLine = "", ...nextLines] = merged.split("\n");

    setLocalText(firstLine);
    void onUpdate(block.id, { text: firstLine });

    if (nextLines.length > 0) {
      void onPasteLines(block.id, nextLines);
    }
  };

  const showMarkdownToolbar =
    canEdit && isFocused && ["paragraph", "quote", "table"].includes(block.type);

  const markdownEnabled = block.type !== "code";

  const textareaEl = (
    <textarea
      ref={textareaRef}
      value={localText}
      onChange={(e) => {
        const nextText = e.target.value;
        setLocalText(nextText);
        if (coalescedTextSave) {
          void onUpdate(block.id, { text: nextText });
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        onFlushRequest?.(block.id);
      }}
      onFocus={() => setIsFocused(true)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      disabled={!canEdit}
      className={clsx(
        "w-full resize-none overflow-hidden bg-transparent text-[16px] leading-7 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
        block.type === "code" && "min-h-[12rem] font-mono text-[13px] leading-relaxed",
        block.type === "heading" && HEADING_CLASS[headingLevel(block)],
        block.type === "quote" && "text-neutral-700 italic dark:text-neutral-300",
        !["heading", "code"].includes(block.type) && "text-neutral-800 dark:text-neutral-200"
      )}
      placeholder={
        block.type === "code"
          ? "Código…"
          : block.type === "heading"
            ? "Título…"
            : "Digite ou use **negrito**, *itálico*, listas, [links](url), ```código```…"
      }
      rows={block.type === "code" ? 10 : block.type === "table" ? 6 : 1}
    />
  );

  let editArea: React.ReactNode;
  if (!canEdit) {
    editArea = (
      <NoteRichContent text={localText} marks={marks} markdown={markdownEnabled} tight={false} />
    );
  } else if (!isFocused && localText.trim().length > 0) {
    editArea = (
      <button
        type="button"
        className="w-full rounded-md px-1.5 py-1 text-left transition-colors hover:bg-neutral-100/60 dark:hover:bg-neutral-800/50"
        aria-label="Editar bloco"
        title="Editar bloco"
        onClick={() => {
          setIsFocused(true);
          requestAnimationFrame(() => textareaRef.current?.focus());
        }}
      >
        <NoteRichContent text={localText} marks={marks} markdown={markdownEnabled} tight={false} />
      </button>
    );
  } else {
    editArea = (
      <>
        {showMarkdownToolbar ? <NoteFormatToolbar actions={markdownActions} /> : null}
        {textareaEl}
      </>
    );
  }

  const shellClass = clsx("group relative", isDragging ? "z-50" : "");

  const contentShellClass = clsx(
    "rounded-md px-1.5 py-0",
    isDragging &&
      "bg-neutral-100 shadow-lg ring-2 ring-yellow-500/20 dark:bg-neutral-800 dark:ring-yellow-500/40",
    block.type === "quote" &&
      "border-l-4 border-neutral-300 pl-3 italic dark:border-surface-dark-border-muted"
  );

  /* -------- Tipos especiais -------- */

  if (block.type === "divider") {
    return (
      <div className={shellClass}>
        <DragHandle dragHandleProps={dragHandleProps} />
        <hr className="dark:border-surface-dark-border-strong my-6 border-neutral-200" />
      </div>
    );
  }

  if (block.type === "image") {
    const src =
      typeof attrs.src === "string" ? attrs.src : typeof block.text === "string" ? block.text : "";
    const alt = typeof attrs.alt === "string" ? attrs.alt : "";
    const resolved = src ? getStorageUrl(src) : "";

    return (
      <div className={shellClass}>
        <DragHandle dragHandleProps={dragHandleProps} />
        <div className="rounded-md px-1.5 py-1">
          {resolved ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolved}
              alt={alt}
              className="max-h-[min(480px,70vh)] w-full rounded-lg object-contain"
            />
          ) : (
            <p className="text-sm text-neutral-500">Sem imagem (defina attrs.src no bloco)</p>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "video") {
    const src =
      typeof attrs.src === "string" ? attrs.src : typeof block.text === "string" ? block.text : "";
    const resolved = src ? getStorageUrl(src) : "";

    return (
      <div className={shellClass}>
        <DragHandle dragHandleProps={dragHandleProps} />
        <div className="rounded-md px-1.5 py-1">
          {resolved ? (
            <video
              src={resolved}
              controls
              playsInline
              preload="metadata"
              className="max-h-[min(480px,70vh)] w-full rounded-lg"
            />
          ) : (
            <p className="text-sm text-neutral-500">Sem vídeo (defina attrs.src no bloco)</p>
          )}
        </div>
      </div>
    );
  }

  if (block.type === "todo") {
    const checked = Boolean(block.done ?? attrs.checked === true);

    return (
      <div className={shellClass}>
        <DragHandle dragHandleProps={dragHandleProps} />
        <div className={clsx("flex gap-2", contentShellClass)}>
          <input
            type="checkbox"
            checked={checked}
            disabled={!canEdit}
            onChange={(e) => {
              void onUpdate(block.id, { done: e.target.checked });
            }}
            className="text-brand-primary-600 accent-brand-primary-500 dark:border-surface-dark-border-muted mt-1.5 h-4 w-4 shrink-0 rounded border-neutral-300"
          />
          <div className="min-w-0 flex-1">{editArea}</div>
        </div>
      </div>
    );
  }

  if (block.type === "list") {
    const ordered = attrs.ordered === true;
    const listClass = ordered ? "list-decimal" : "list-disc";

    return (
      <div className={shellClass}>
        <DragHandle dragHandleProps={dragHandleProps} />
        <div className={contentShellClass}>
          {localText.trim().length > 0 ? (
            <div className="mb-3 text-neutral-700 dark:text-neutral-300">
              <NoteRichContent text={localText} marks={marks} markdown />
            </div>
          ) : null}
          {block.children && block.children.length > 0 ? (
            ordered ? (
              <ol className={clsx("space-y-1 pl-6", listClass)}>
                {block.children.map((child: Block & { children?: Block[] }) => (
                  <li key={child.id} className="leading-7">
                    <NoteBlockEditor
                      block={child}
                      noteId=""
                      onUpdate={onUpdate}
                      onFlushRequest={onFlushRequest}
                      coalescedTextSave={coalescedTextSave}
                      onPasteLines={onPasteLines}
                      onAddBlockAfter={onAddBlockAfter}
                      onBackspaceEmpty={onBackspaceEmpty}
                      focusBlockId={focusBlockId}
                      onFocused={onFocused}
                      canEdit={canEdit}
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <ul className={clsx("space-y-1 pl-6", listClass)}>
                {block.children.map((child: Block & { children?: Block[] }) => (
                  <li key={child.id} className="leading-7">
                    <NoteBlockEditor
                      block={child}
                      noteId=""
                      onUpdate={onUpdate}
                      onFlushRequest={onFlushRequest}
                      coalescedTextSave={coalescedTextSave}
                      onPasteLines={onPasteLines}
                      onAddBlockAfter={onAddBlockAfter}
                      onBackspaceEmpty={onBackspaceEmpty}
                      focusBlockId={focusBlockId}
                      onFocused={onFocused}
                      canEdit={canEdit}
                    />
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </div>
      </div>
    );
  }

  if (block.type === "heading") {
    const level = headingLevel(block);

    const headingPreview = (
      <HeadingElement level={level} className={HEADING_CLASS[level]}>
        <NoteRichContent text={localText} marks={marks} markdown={false} tight />
      </HeadingElement>
    );

    return (
      <div className={shellClass}>
        <DragHandle dragHandleProps={dragHandleProps} />
        <div className={contentShellClass}>
          {!canEdit ? (
            headingPreview
          ) : !isFocused && localText.trim().length > 0 ? (
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                setIsFocused(true);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
            >
              {headingPreview}
            </button>
          ) : (
            textareaEl
          )}
        </div>
      </div>
    );
  }

  /* -------- paragraph | quote | code | table | page (default) -------- */

  return (
    <div className={shellClass}>
      <DragHandle dragHandleProps={dragHandleProps} />
      <div className={contentShellClass}>{editArea}</div>

      {block.children && block.children.length > 0 ? (
        <div className="dark:border-surface-dark-border mt-0.5 ml-6 border-l-2 border-neutral-200 pl-4">
          {block.children.map((child: Block & { children?: Block[] }) => (
            <NoteBlockEditor
              key={child.id}
              block={child}
              noteId=""
              onUpdate={onUpdate}
              onFlushRequest={onFlushRequest}
              coalescedTextSave={coalescedTextSave}
              onPasteLines={onPasteLines}
              onAddBlockAfter={onAddBlockAfter}
              onBackspaceEmpty={onBackspaceEmpty}
              focusBlockId={focusBlockId}
              onFocused={onFocused}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
