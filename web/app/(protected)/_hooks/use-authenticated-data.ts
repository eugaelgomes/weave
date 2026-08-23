"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { useNotes } from "@/app/_contexts/notes-context";
import { useProjects } from "@/app/_contexts/projects-context";

export function useAuthenticatedData() {
  const { authenticated, user } = useAuth();
  const notesContext = useNotes();
  const projectsContext = useProjects();

  if (!authenticated || !user) {
    throw new Error("useAuthenticatedData must be used in authenticated components");
  }

  return {
    user,
    notes: notesContext,
    projects: projectsContext,
  };
}

export function useSafeAuthenticatedData() {
  const { authenticated, user } = useAuth();
  const notesContext = useNotes();
  const projectsContext = useProjects();

  if (!authenticated || !user) {
    return null;
  }

  return {
    user,
    notes: notesContext,
    projects: projectsContext,
  };
}
