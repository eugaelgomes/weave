"use client";

import { useAuth } from "../contexts/AuthContext";
import { useNotes } from "../contexts/NotesContext";
import { useProjects } from "../contexts/ProjectsContext";

export function useAuthenticatedData() {
  const { authenticated, user } = useAuth();

  if (!authenticated || !user) {
    throw new Error("useAuthenticatedData must be used in authenticated components");
  }

  const notesContext = useNotes();
  const projectsContext = useProjects();

  return {
    user,
    notes: notesContext,
    projects: projectsContext,
  };
}

export function useSafeAuthenticatedData() {
  const { authenticated, user } = useAuth();

  let notesContext;
  let projectsContext;

  try {
    notesContext = useNotes();
    projectsContext = useProjects();
  } catch {
    return null;
  }

  if (!authenticated || !user) {
    return null;
  }

  return {
    user,
    notes: notesContext,
    projects: projectsContext,
  };
}
