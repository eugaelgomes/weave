"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../_contexts/auth-context";
import { useNotes } from "../../_contexts/notes-context";
import { FileText, ChevronRight, LayoutDashboard, Menu, X } from "lucide-react";
import { NotesHeader } from "../_components/ui/headers/notes-header";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading } = useAuth();
  const { loading: notesLoading, getRecentNotes } = useNotes();
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // Se não estiver autenticado, o AuthContext ou middleware deve lidar com o redirect
  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/";
    }
    return null;
  }

  // Pegar até 10 notas recentes a partir da listagem geral de notas ou do getRecentNotes
  // Vou usar o `getRecentNotes` do hook!
  const recentNotes = getRecentNotes ? getRecentNotes().slice(0, 10) : [];

  const isDashboard = pathname === "/app/notes";
  const currentNoteId = !isDashboard ? pathname.split("/app/notes/")[1] : null;
  const sidebarContent = (
    <div className="p-2.5">
      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
        Menu
      </h2>

      <ul className="mb-4 space-y-0.5">
        <li>
          <Link
            href="/app/notes"
            className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
              isDashboard
                ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <LayoutDashboard
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isDashboard ? "text-brand-primary-700" : "text-neutral-400"
                }`}
              />
              <span className="truncate">Painel de Notas</span>
            </div>
            {isDashboard && <ChevronRight className="h-3 w-3 text-neutral-400" />}
          </Link>
        </li>
      </ul>

      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
        Notas Recentes
      </h2>

      <ul className="space-y-0.5">
        {recentNotes.map((note) => {
          const isActive = currentNoteId === note.id;

          return (
            <li key={note.id} className="flex flex-col">
              <div className="flex w-full min-w-0 items-center">
                <Link
                  href={`/app/notes/${note.id}`}
                  className={`group flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                    isActive
                      ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <FileText
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isActive ? "text-brand-primary-700" : "text-neutral-400"
                      }`}
                    />
                    <span className="truncate">{note.title}</span>
                  </div>
                </Link>
              </div>
            </li>
          );
        })}

        {!notesLoading && recentNotes.length === 0 && (
          <li className="px-2 text-xs text-neutral-400 italic">Nenhuma nota recente.</li>
        )}
      </ul>
    </div>
  );

  React.useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-2 md:px-0">
      <NotesHeader />

      <div className="flex flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 md:hidden dark:border-neutral-800">
          <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Navegação
          </span>
          <button
            type="button"
            aria-expanded={isMobileSidebarOpen}
            onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            {isMobileSidebarOpen ? (
              <>
                <X className="h-3.5 w-3.5" />
                Fechar menu
              </>
            ) : (
              <>
                <Menu className="h-3.5 w-3.5" />
                Abrir menu
              </>
            )}
          </button>
        </div>

        <div className="flex flex-1 flex-col md:flex-row">
          {/* SIDEBAR LATERAL */}
          <div className="hidden w-full flex-shrink-0 overflow-y-auto border-b border-neutral-200 bg-neutral-50 md:block md:w-[200px] md:border-r md:border-b-0 dark:border-neutral-800 dark:bg-neutral-900/30">
            {sidebarContent}
          </div>

          {/* CONTEÚDO PRINCIPAL (Detail) */}
          <div className="flex flex-1 flex-col overflow-y-auto bg-white dark:bg-neutral-950">
            {children}
          </div>
        </div>
      </div>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            aria-label="Fechar menu de navegação"
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></button>

          <div className="ml-auto flex h-full w-[80%] max-w-xs flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                Menu de Notas
              </span>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="rounded-md p-1 text-neutral-500 transition hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900/40">
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
