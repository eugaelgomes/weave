"use client";

import React from "react";
import { NotesProvider } from "./notes-context";
import { ProjectsProvider } from "./projects-context";
import { OrganizationProvider } from "./organization-context";
import { ChatProvider } from "./chat-context";

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
