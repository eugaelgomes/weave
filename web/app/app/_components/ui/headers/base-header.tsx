"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFormatters } from "@/app/_utils/product-patterns";

interface BaseHeaderProps {
  className?: string;
  leftContent: ReactNode;
  rightContent?: ReactNode;
}

export function BaseHeader({ className, leftContent, rightContent }: BaseHeaderProps) {
  const { dateFormat, timeFormat } = useFormatters();
  const userCurrentDateTime = new Date();

  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white p-2 shadow-md sm:gap-4 sm:px-4 sm:py-1 dark:border-neutral-800 dark:bg-neutral-800",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium tracking-tight text-neutral-900 sm:text-sm dark:text-neutral-100">
          {leftContent}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-neutral-600 sm:gap-4 sm:text-sm dark:text-neutral-400">
        <span className="truncate text-xs">
          {`${dateFormat(userCurrentDateTime)} ${timeFormat(userCurrentDateTime)}`}
        </span>
        {rightContent}
      </div>
    </div>
  );
}
