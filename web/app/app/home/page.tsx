"use client";

import React, { useMemo } from "react";

// Contexts
import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";
import { useLanguage } from "@/app/_contexts/language-context";

// Utils & Components

import { HomeHeader } from "../_components/ui/headers/home-header";
import { CalendarPreview } from "../calendar/_components/calendar-component";
import NotesCarousel from "./_components/notes-carousel";
import ProjectsCarousel from "./_components/project-carousel";
import HomeDashboard from "./_components/home-dashboard";

export default function HomePage() {
  const { authenticated, loading } = useAuth();
  const { getRecentNotes } = useNotes();
  const { getRecentProjects } = useProjects();
  const { t } = useLanguage();

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
      <div className="flex-1 space-y-3 overflow-y-auto">
        <HomeHeader />

        <HomeDashboard />

        <NotesCarousel notes={recentNotes} />

        <ProjectsCarousel projects={recentProjects} />

        <CalendarPreview />
      </div>
    </div>
  );
}
