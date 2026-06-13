"use client";

import React from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { FileText, ChevronRight, LayoutDashboard } from "lucide-react";
import { NotesHeader } from "@/app/(protected)/_components/ui/headers/notes-header";
import {
  NoteCommentsPanelProvider,
  useNoteCommentsPanel,
} from "@/app/_contexts/note-comments-panel-context";
import GlobalLoading from "@/app/_components/ui/global-loading";
import { getNotePath } from "@/app/_utils/note-path";
import { ModuleLayout } from "@/app/(protected)/_components/layout/module-layout";
import { NotesProvider } from "@/app/_contexts/notes-context";
import { TagsProvider } from "@/app/_contexts/tags-context";
import { TaskPrioritiesProvider } from "@/app/_contexts/task-priorities-context";

function NotesLayoutContent({ children }: { children: React.ReactNode }) {
  const { loading: notesLoading, getRecentNotes } = useNotes();
  const pathname = usePathname();
  const { commentsPanelOpen, setCommentsPanelOpen } = useNoteCommentsPanel();
  const params = useParams();
  const orgId = params?.orgId as string;

  React.useEffect(() => {
    setCommentsPanelOpen(false);
  }, [pathname, setCommentsPanelOpen]);

  const recentNotes = getRecentNotes ? getRecentNotes().slice(0, 10) : [];

  const base = pathname.replace(/\/+$/, "");
  const isDashboard = base === `/${orgId}/notes`;
  const currentNoteId =
    base.startsWith(`/${orgId}/notes/`) && base !== `/${orgId}/notes`
      ? (base.split(`/${orgId}/notes/`)[1]?.split("/")[0] ?? null)
      : null;

  const sidebarContent = (
    <div className="p-2.5">
      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        Menu
      </h2>

      <ul className="mb-4 space-y-0.5">
        <li>
          <Link
            href={`/${orgId}/notes`}
            className={`group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
              isDashboard
                ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <LayoutDashboard
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isDashboard ? "text-brand-primary-500" : "text-neutral-400"
                }`}
              />
              <span className="truncate">Painel de Tarefas</span>
            </div>
            {isDashboard && <ChevronRight className="h-3 w-3 text-neutral-400" />}
          </Link>
        </li>
      </ul>

      <h2 className="mb-2 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
        Tarefas Recentes
      </h2>

      <ul className="space-y-0.5">
        {recentNotes.map((note) => {
          const isActive = currentNoteId === note.public_id || currentNoteId === note.id;

          return (
            <li key={note.id} className="flex flex-col">
              <div className="flex w-full min-w-0 items-center">
                <Link
                  href={getNotePath(note)}
                  className={`group flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1.5 text-xs transition-all ${
                    isActive
                      ? "bg-neutral-200/60 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/50"
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-1.5">
                    <FileText
                      className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isActive ? "text-brand-primary-500" : "text-neutral-400"
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
          <li className="px-2 text-xs text-neutral-400 italic">Nenhuma tarefa recente.</li>
        )}
      </ul>
    </div>
  );

  return (
    <ModuleLayout
      header={<NotesHeader />}
      sidebarContent={sidebarContent}
      hideSidebarOnDesktop={commentsPanelOpen}
    >
      {children}
    </ModuleLayout>
  );
}

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <GlobalLoading fullScreen={false} />;
  }

  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/";
    }
    return null;
  }

  return (
    <TagsProvider>
      <TaskPrioritiesProvider>
        <NoteCommentsPanelProvider>
          <NotesLayoutContent>{children}</NotesLayoutContent>
        </NoteCommentsPanelProvider>
      </TaskPrioritiesProvider>
    </TagsProvider>
  );
}
