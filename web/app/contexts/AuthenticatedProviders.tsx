"use client";

import React from "react";
import { NotesProvider } from "./NotesContext";
import { ProjectsProvider } from "./ProjectsContext";
import { ChatProvider } from "./ChatContext";

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotesProvider>
      <ProjectsProvider>
        <ChatProvider>{children}</ChatProvider>
      </ProjectsProvider>
    </NotesProvider>
  );
}
