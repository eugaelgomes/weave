"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SidebarSectionHeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

export function SidebarSectionHeader({ title, className, children }: SidebarSectionHeaderProps) {
  return (
    <div className={cn("mb-2 flex items-center justify-between border-b border-neutral-100 pb-1 -mx-2 px-3 dark:border-neutral-800", className)}>
      <h2 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        {title}
      </h2>
      {children && <div className="flex items-center gap-1">{children}</div>}
    </div>
  );
}
