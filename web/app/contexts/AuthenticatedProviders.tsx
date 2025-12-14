"use client";

import React from "react";
import { NotesProvider } from "./NotesContext";
import { ProjectsProvider } from "./ProjectsContext";

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotesProvider>
      <ProjectsProvider>{children}</ProjectsProvider>
    </NotesProvider>
  );
}
