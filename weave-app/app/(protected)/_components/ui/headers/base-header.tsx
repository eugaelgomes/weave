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
        "border-l-brand-primary-500 shadow-sm dark:shadow-surface-dark-sm flex flex-row items-center justify-between gap-3 rounded-md border border-l-4  border-brand-beige bg-white p-1 backdrop-blur-sm sm:gap-4 sm:px-3 sm:py-1 dark:border-neutral-600 dark:bg-[#1d1d1b]/50",
        className
      )}
    >
      {/* Lado Esquerdo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center text-[11px] font-medium tracking-tight text-gray-900 dark:text-gray-100">
          {leftContent}
        </div>
      </div>

      {/* Lado Direito (Data e Content) */}
      <div className="flex items-center gap-3 text-[10px] text-gray-500 sm:gap-4 dark:text-gray-400">
        <span className="flex items-center truncate text-[9px] leading-none">
          {`${dateFormat(userCurrentDateTime)} ${timeFormat(userCurrentDateTime)}`}
        </span>

        {rightContent && <div className="flex items-center">{rightContent}</div>}
      </div>
    </div>
  );
}
