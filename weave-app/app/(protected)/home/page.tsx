"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { HomeHeader } from "@/app/(protected)/_components/ui/headers/home-header";
import { CalendarPreview } from "@/app/(protected)/calendar/page";
import WeaveEngineDashboard from "./_components/weave-reasonings";
import NotesCarousel from "./_components/notes-carousel";
import ProjectsCarousel from "./_components/project-carousel";

export default function HomePage() {
  const { authenticated, loading } = useAuth();
  const { getRecentNotes } = useNotes();
  const { getRecentProjects } = useProjects();

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center bg-white dark:bg-[#1d1d1b]">
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
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto">
        <HomeHeader />

        <WeaveEngineDashboard variant="home" />

        <NotesCarousel notes={recentNotes} />

        <ProjectsCarousel projects={recentProjects} />

        <CalendarPreview />
      </div>
    </div>
  );
}
