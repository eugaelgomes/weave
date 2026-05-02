"use client";

import React, { ReactNode } from "react";

const rootStyles =
  "flex w-full min-w-0 flex-row items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-sm shadow-md dark:border-neutral-800 dark:bg-neutral-800";

interface ApplicationPageNavProps {
  /** Classes extras no container (mesma base do BaseHeader). */
  className?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  "aria-label"?: string;
}

export function ApplicationPageNav({
  className,
  leftContent,
  rightContent,
  "aria-label": ariaLabel = "Ações da página",
}: ApplicationPageNavProps) {
  const rootClass = className ? `${rootStyles} ${className}` : rootStyles;

  return (
    <nav className={rootClass} aria-label={ariaLabel}>
      <div className="flex min-w-0 flex-1 items-center gap-2">{leftContent}</div>
      {rightContent != null ? (
        <div className="flex shrink-0 items-center gap-2">{rightContent}</div>
      ) : null}
    </nav>
  );
}
