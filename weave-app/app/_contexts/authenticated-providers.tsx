"use client";

import React from "react";
import { NotesProvider } from "./notes-context";
import { ProjectsProvider } from "./projects-context";
import { OrganizationProvider } from "./organization-context";
import { ChatProvider } from "./chat-context";
import { AgentProvider } from "./agent-context";
import { NotificationProvider } from "./notification-context";
import { CalendarProvider } from "./calendar-context";
import { ApiTokensProvider } from "./api-tokens-context";
import { TagsProvider } from "./tags-context";
import { TaskPrioritiesProvider } from "./task-priorities-context";
import { WeaveEngineProvider } from "./weave-engine-context";
import { BackupProvider } from "./backup-context";
import { TaskNoteModalProvider } from "@/app/(protected)/_components/task-note-modal";
import { SlackProvider } from "./slack-context";

// Exemplo (opcional, apenas para melhorar a leitura do código)
const composeProviders = (...providers: React.ElementType[]) =>
  providers.reduce((AccumulatedProviders, CurrentProvider) => {
    const ComposedProviders = ({ children }: { children: React.ReactNode }) => (
      <AccumulatedProviders>
        <CurrentProvider>{children}</CurrentProvider>
      </AccumulatedProviders>
    );
    (ComposedProviders as any).displayName =
      `Composed(${(CurrentProvider as any).displayName || (CurrentProvider as any).name || "Provider"})`;
    return ComposedProviders;
  });

const AppProviders = composeProviders(
  NotesProvider,
  ProjectsProvider,
  OrganizationProvider,
  NotificationProvider,
  CalendarProvider,
  ApiTokensProvider,
  BackupProvider,
  TagsProvider,
  TaskPrioritiesProvider,
  WeaveEngineProvider,
  ChatProvider,
  AgentProvider,
  SlackProvider,
  TaskNoteModalProvider
);

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
