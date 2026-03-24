"use client";

import React from "react";
import { NotesProvider } from "./notes-context";
import { ProjectsProvider } from "./projects-context";
import { OrganizationProvider } from "./organization-context";
import { ChatProvider } from "./chat-context";
import { AgentProvider } from "./agent-context";
import { NotificationProvider } from "./notification-context";
import { CalendarProvider } from "./calendar-context";

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <NotesProvider>
      <ProjectsProvider>
        <OrganizationProvider>
          <NotificationProvider>
            <CalendarProvider>
              <ChatProvider>
                <AgentProvider>{children}</AgentProvider>
              </ChatProvider>
            </CalendarProvider>
          </NotificationProvider>
        </OrganizationProvider>
      </ProjectsProvider>
    </NotesProvider>
  );
}
