"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ModuleLayoutProps {
  header: React.ReactNode;
  sidebarContent?: React.ReactNode;
  children: React.ReactNode;
  hideSidebarOnDesktop?: boolean;
}

export function ModuleLayout({
  header,
  sidebarContent,
  children,
  hideSidebarOnDesktop = false,
}: ModuleLayoutProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 md:px-0">
      {header}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          {/* SIDEBAR LATERAL */}
          {sidebarContent && (
            <div
              className={cn(
                "dark:border-surface-dark-border hidden w-full flex-shrink-0 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-sm md:sticky md:h-[calc(100vh-auto)] dark:bg-[#1d1d1b]/50",
                hideSidebarOnDesktop ? "md:hidden" : "md:block md:w-[180px]"
              )}
            >
              {sidebarContent}
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL (Detail) */}
          <div className="dark:shadow-surface-dark-sm md:dark:border-surface-dark-border flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-[#1d1d1b]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
