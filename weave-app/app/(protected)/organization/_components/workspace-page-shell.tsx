"use client";

import React from "react";

type WorkspacePageShellProps = {
  description: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
};

export function WorkspacePageShell({
  description,
  children,
  rightContent,
}: WorkspacePageShellProps) {
  return (
    <>
      <div className="dark:border-surface-dark-border border-b border-neutral-200 px-2 py-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{description}</p>
          {rightContent ?? null}
        </div>
      </div>
      <div className="flex w-full flex-col gap-6 px-2 py-2">{children}</div>
    </>
  );
}
