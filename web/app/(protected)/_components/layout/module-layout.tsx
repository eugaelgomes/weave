"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 md:px-0">
      {header}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Header for Sidebar Toggle */}
        {sidebarContent && (
          <div className="mb-2 flex items-center justify-between px-1 py-1.5 md:hidden">
            <span className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
              Navegação
            </span>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="dark:border-surface-dark-border-strong flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              {isMobileMenuOpen ? (
                <>
                  <X className="h-3 w-3" /> Fechar menu
                </>
              ) : (
                <>
                  <Menu className="h-3 w-3" /> Abrir menu
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-2">
          {/* SIDEBAR LATERAL (Desktop) */}
          {sidebarContent && (
            <div
              className={cn(
                "hidden w-full flex-shrink-0 overflow-y-auto rounded-md border border-neutral-200 bg-white md:sticky md:h-[calc(100vh-auto)] dark:border-neutral-800 dark:bg-[#1d1d1b]",
                hideSidebarOnDesktop ? "md:hidden" : "md:block md:w-[200px]"
              )}
            >
              {sidebarContent}
            </div>
          )}

          {/* SIDEBAR LATERAL (Mobile Drawer) */}
          {sidebarContent && isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar menu"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div
                className="dark:border-surface-dark-border relative z-10 ml-auto flex h-full w-[80%] max-w-xs flex-col border-l border-neutral-200 bg-white shadow-xl dark:bg-[#1d1d1b]"
                onClick={(e) => {
                  // If a link was clicked inside the drawer, close it
                  if (
                    (e.target as HTMLElement).closest("a") ||
                    (e.target as HTMLElement).closest("button")
                  ) {
                    setIsMobileMenuOpen(false);
                  }
                }}
              >
                <div className="dark:border-surface-dark-border flex items-center justify-between border-b border-neutral-200 px-3 py-2">
                  <span className="text-xs font-semibold tracking-wider text-neutral-500 dark:text-neutral-400">
                    Menu
                  </span>
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-[#1d1d1b]/40">
                  {sidebarContent}
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO PRINCIPAL (Detail) */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#1d1d1b]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
