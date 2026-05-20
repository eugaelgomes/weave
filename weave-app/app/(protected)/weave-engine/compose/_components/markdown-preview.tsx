"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = {
  markdown: string;
  emptyLabel: string;
  className?: string;
};

export function MarkdownPreview({ markdown, emptyLabel, className }: MarkdownPreviewProps) {
  const trimmed = markdown.trim();

  return (
    <div
      className={
        className ??
        "prose prose-sm dark:prose-invert max-w-none rounded-md border border-neutral-200 bg-neutral-50/80 p-3 text-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]/60"
      }
    >
      {trimmed ? (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
      ) : (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{emptyLabel}</p>
      )}
    </div>
  );
}
