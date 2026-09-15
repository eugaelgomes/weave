"use client";

import React from "react";

type SettingsPageShellProps = {
  description: string;
  children: React.ReactNode;
  rightContent?: React.ReactNode;
};

export function SettingsPageShell({ description, children, rightContent }: SettingsPageShellProps) {
  return (
    <>
      <div className="border-b border-neutral-200/80 px-4 py-2.5 sm:px-5 dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
          {rightContent ?? null}
        </div>
      </div>
      <div className="flex w-full flex-col gap-5 p-4 sm:p-5">{children}</div>
    </>
  );
}
