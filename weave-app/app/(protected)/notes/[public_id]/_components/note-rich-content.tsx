"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import clsx from "clsx";
import type { Components } from "react-markdown";
import getStorageUrl from "@/app/_utils/get-storage-url";

import "highlight.js/styles/github-dark.css";

export interface ContentMark {
  start: number;
  end: number;
  type: string;
  attrs?: Record<string, unknown>;
}

const MARK_WRAP_ORDER = [
  "link",
  "bold",
  "italic",
  "code",
  "strike",
  "underline",
  "highlight",
  "subscript",
  "superscript",
  "textStyle",
] as const;

function segmentBounds(textLen: number, marks: ContentMark[]): number[] {
  const breaks = new Set<number>([0, textLen]);
  for (const m of marks) {
    const s = Math.max(0, Math.min(m.start, textLen));
    const e = Math.max(0, Math.min(m.end, textLen));
    breaks.add(s);
    breaks.add(e);
  }
  return [...breaks].sort((a, b) => a - b);
}

function activeMarksForSegment(
  marks: ContentMark[],
  segStart: number,
  segEnd: number
): ContentMark[] {
  return marks.filter((m) => m.start <= segStart && m.end >= segEnd);
}

function sortMarksForNesting(marks: ContentMark[]): ContentMark[] {
  return [...marks].sort(
    (a, b) =>
      MARK_WRAP_ORDER.indexOf(a.type as (typeof MARK_WRAP_ORDER)[number]) -
      MARK_WRAP_ORDER.indexOf(b.type as (typeof MARK_WRAP_ORDER)[number])
  );
}

function wrapNode(node: React.ReactNode, mark: ContentMark, key: string): React.ReactNode {
  const { type, attrs = {} } = mark;
  switch (type) {
    case "bold":
      return (
        <strong key={key} className="font-semibold">
          {node}
        </strong>
      );
    case "italic":
      return (
        <em key={key} className="italic">
          {node}
        </em>
      );
    case "strike":
      return (
        <del key={key} className="line-through opacity-90">
          {node}
        </del>
      );
    case "underline":
      return (
        <span key={key} className="underline underline-offset-2">
          {node}
        </span>
      );
    case "code":
      return (
        <code
          key={key}
          className="rounded bg-neutral-200/90 px-1 py-0.5 font-mono text-[0.9em] dark:bg-neutral-800"
        >
          {node}
        </code>
      );
    case "highlight":
      return (
        <mark
          key={key}
          className="rounded px-0.5"
          style={{
            backgroundColor:
              typeof attrs.color === "string" ? attrs.color : "rgba(250, 204, 21, 0.35)",
          }}
        >
          {node}
        </mark>
      );
    case "subscript":
      return (
        <sub key={key} className="text-[0.85em]">
          {node}
        </sub>
      );
    case "superscript":
      return (
        <sup key={key} className="text-[0.85em]">
          {node}
        </sup>
      );
    case "link": {
      const href = typeof attrs.href === "string" ? attrs.href : "#";
      const target = attrs.target === "_blank" ? "_blank" : undefined;
      return (
        <a
          key={key}
          href={href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="text-brand-primary-600 dark:text-brand-primary-400 font-medium underline-offset-2 hover:underline"
        >
          {node}
        </a>
      );
    }
    case "textStyle": {
      const color = typeof attrs.color === "string" ? attrs.color : undefined;
      return (
        <span key={key} style={color ? { color } : undefined}>
          {node}
        </span>
      );
    }
    default:
      return <React.Fragment key={key}>{node}</React.Fragment>;
  }
}

function renderMarksTree(text: string, marks: ContentMark[]): React.ReactNode {
  if (!text) return null;
  const len = text.length;
  const normalized = marks.filter(
    (m) =>
      Number.isFinite(m.start) &&
      Number.isFinite(m.end) &&
      m.start < m.end &&
      m.start < len &&
      m.end > 0
  );
  if (normalized.length === 0) return text;

  const points = segmentBounds(len, normalized);
  const parts: React.ReactNode[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const slice = text.slice(a, b);
    if (!slice) continue;

    const active = activeMarksForSegment(normalized, a, b);
    const ordered = sortMarksForNesting(active);

    let wrapped: React.ReactNode = slice;
    ordered.forEach((m, idx) => {
      wrapped = wrapNode(wrapped, m, `${a}-${b}-${m.type}-${idx}`);
    });
    parts.push(<React.Fragment key={`${a}-${b}`}>{wrapped}</React.Fragment>);
  }

  return <>{parts}</>;
}

const markdownComponents = (opts: {
  /** Parágrafo raiz — evita margem dupla quando já há wrapper externo */
  tight?: boolean;
}): Components => ({
  h1: ({ children }) => (
    <h1
      className={clsx(
        "font-bold tracking-tight text-neutral-900 dark:text-neutral-50",
        opts.tight ? "mt-0 mb-1 text-2xl first:mt-0" : "mt-4 mb-2 text-3xl first:mt-0"
      )}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      className={clsx(
        "font-semibold tracking-tight text-neutral-900 dark:text-neutral-50",
        opts.tight ? "mt-2 mb-1 text-xl" : "mt-5 mb-2 text-2xl"
      )}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-base font-semibold text-neutral-900 dark:text-neutral-100">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p
      className={clsx(
        "text-[16px] leading-7 text-neutral-800 dark:text-neutral-200",
        opts.tight ? "mb-0 last:mb-0" : "mb-2 last:mb-0"
      )}
    >
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-0.5 pl-6 text-[16px] leading-7 marker:text-neutral-500 dark:marker:text-neutral-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-0.5 pl-6 text-[16px] leading-7 marker:text-neutral-500 dark:marker:text-neutral-400">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-brand-primary-600 dark:text-brand-primary-400 font-medium underline-offset-2 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="dark:border-surface-dark-border-muted my-2 border-l-4 border-neutral-300 pl-4 text-neutral-700 italic dark:text-neutral-300">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="dark:border-surface-dark-border-strong my-4 border-neutral-200" />,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-xl bg-neutral-100 p-4 dark:bg-[#1d1d1b]/80">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isFence = typeof className === "string" && className.includes("language-");
    if (isFence) {
      return (
        <code className={clsx(className, "font-mono text-[13px] leading-relaxed")}>{children}</code>
      );
    }
    return (
      <code className="rounded bg-neutral-200/90 px-1 py-0.5 font-mono text-[0.9em] dark:bg-neutral-800">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="dark:border-surface-dark-border-strong border-b border-neutral-200">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="dark:border-surface-dark-border border-b border-neutral-100 last:border-0">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-200">{children}</td>
  ),
  img: ({ src, alt }) => {
    const path = typeof src === "string" ? src : "";
    const resolved = path ? getStorageUrl(path) : "";
    if (!resolved) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URLs dinâmicas (CDN / paths)
      <img
        src={resolved}
        alt={typeof alt === "string" ? alt : ""}
        className="my-3 h-auto max-h-[min(480px,70vh)] w-full max-w-full rounded-lg object-contain"
        loading="lazy"
      />
    );
  },
  input: ({ type, checked, disabled }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={Boolean(checked)}
          disabled={disabled}
          readOnly
          className="text-brand-primary-600 accent-brand-primary-500 dark:border-surface-dark-border-muted mt-1 mr-2 h-4 w-4 shrink-0 rounded border-neutral-300"
        />
      );
    }
    return <input type={type} />;
  },
});

export interface NoteRichContentProps {
  text: string;
  marks?: ContentMark[] | null;
  /** Se true, interpreta `text` como Markdown GFM (parágrafos, listas, imagens, etc.) */
  markdown?: boolean;
  /** Classes no wrapper externo */
  className?: string;
  /** Markdown sem margens grandes (ex.: dentro de heading ou quote) */
  tight?: boolean;
}

/**
 * Conteúdo formatado: prioriza `marks` quando existem; senão renderiza Markdown GFM.
 */
export function NoteRichContent({
  text,
  marks,
  markdown = true,
  className,
  tight = false,
}: NoteRichContentProps) {
  const body = text ?? "";
  const components = useMemo(() => markdownComponents({ tight }), [tight]);

  const inner = useMemo(() => {
    const hasMarks = Array.isArray(marks) && marks.length > 0;
    if (hasMarks) {
      return renderMarksTree(body, marks as ContentMark[]);
    }
    if (!markdown) {
      return <span className="whitespace-pre-wrap">{body}</span>;
    }
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {body || ""}
      </ReactMarkdown>
    );
  }, [body, marks, markdown, components]);

  return (
    <div
      className={clsx(
        "note-rich-content max-w-none text-[16px] leading-7 text-neutral-800 select-text dark:text-neutral-200",
        className
      )}
    >
      {inner}
    </div>
  );
}
