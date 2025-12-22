"use client";

import React from "react";
import { NotesProvider } from "./NotesContext";
import { ProjectsProvider } from "./ProjectsContext";
import { OrganizationProvider } from "./OrganizationContext";
import { ChatProvider } from "./ChatContext";

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotesProvider>
      <ProjectsProvider>
        <OrganizationProvider>
          <ChatProvider>{children}</ChatProvider>
        </OrganizationProvider>
      </ProjectsProvider>
    </NotesProvider>
  );
}
