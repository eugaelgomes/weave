"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { CalendarPreview } from "@/app/(protected)/calendar/page";
import WeaveEngineDashboard from "./_components/weave-reasonings";
import NotesCarousel from "./_components/notes-carousel";
import ProjectsCarousel from "./_components/project-carousel";

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
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto">
        <div className="animate-in fade-in flex w-full items-center justify-start px-1 duration-500">
          <h2 className="font-fredoka text-lg font-medium tracking-tight text-neutral-500 dark:text-neutral-500">
            {t.home.greetingPrefix}{" "}
            <span className="text-brand-yellow dark:text-brand-yellow font-semibold">
              {user?.user_name?.split(" ")[0] || user?.username || ""}
            </span>
            ,
          </h2>
        </div>

        <WeaveEngineDashboard variant="home" />

        <NotesCarousel notes={recentNotes} />

        <ProjectsCarousel projects={recentProjects} />

        <CalendarPreview />
      </div>
    </div>
  );
}
