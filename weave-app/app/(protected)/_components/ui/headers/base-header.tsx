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
        "flex flex-row items-center justify-between gap-3 rounded-md border border-gray-200 border-l-4 border-l-brand-primary-500 bg-gray-50/50 p-2 shadow-sm backdrop-blur-sm sm:gap-4 sm:px-3 sm:py-1.5 dark:border-gray-800 dark:bg-gray-900/50",
        className
      )}
    >
      {/* Lado Esquerdo */}
      <div className="flex items-center gap-2">
        <div className="flex items-center text-xs font-medium tracking-tight text-gray-900 sm:text-sm dark:text-gray-100">
          {leftContent}
        </div>
      </div>

      {/* Lado Direito (Data e Content) */}
      <div className="flex items-center gap-3 text-xs text-gray-500 sm:gap-4 dark:text-gray-400">
        <span className="flex items-center truncate text-[10px] leading-none">
          {`${dateFormat(userCurrentDateTime)} ${timeFormat(userCurrentDateTime)}`}
        </span>
        
        {rightContent && (
          <div className="flex items-center">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}