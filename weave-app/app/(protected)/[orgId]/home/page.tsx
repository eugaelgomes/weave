"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { CalendarPreview } from "@/app/(protected)/[orgId]/calendar/page";
import WeaveEngineDashboard from "@/app/(protected)/[orgId]/home/_components/weave-reasonings";
import NotesCarousel from "@/app/(protected)/[orgId]/home/_components/notes-carousel";
import ProjectsCarousel from "@/app/(protected)/[orgId]/home/_components/project-carousel";

export default function HomePage() {
  const { authenticated, loading, user } = useAuth();
  const { t } = useLanguage();
  const { getRecentNotes } = useNotes();
  const { getRecentProjects } = useProjects();

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/";
    }
    return null;
  }
  const recentNotes = getRecentNotes();
  const recentProjects = getRecentProjects();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="-mx-1.5 flex-1 space-y-2 overflow-y-auto px-1.5 pb-4">
        <WeaveEngineDashboard variant="home" />

        <NotesCarousel notes={recentNotes} />

        <ProjectsCarousel projects={recentProjects} />

        <CalendarPreview />
      </div>
    </div>
  );
}
