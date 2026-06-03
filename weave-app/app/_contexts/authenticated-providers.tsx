"use client";

import React from "react";
import { NotificationProvider } from "./notification-context";
import { CalendarProvider } from "./calendar-context";
import { TaskNoteModalProvider } from "@/app/(protected)/_components/task-note-modal";
import { ProjectsProvider } from "./projects-context";
import { ChatProvider } from "./chat-context";
import { AgentProvider } from "./agent-context";
import { NotesProvider } from "./notes-context";

// Apenas providers globais — necessários em todas as rotas protegidas.
// Os demais providers são carregados sob demanda nos layouts de cada módulo.
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

const GlobalProviders = composeProviders(
  NotificationProvider,
  CalendarProvider,
  TaskNoteModalProvider,
  ProjectsProvider,
  NotesProvider,
  AgentProvider,
  ChatProvider
);

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return <GlobalProviders>{children}</GlobalProviders>;
}
