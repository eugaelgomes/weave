"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export interface NotesShellContextType {
  /** Quando true, a coluna de navegação esquerda (menu + recentes) fica oculta no desktop. */
  leftNavCollapsedForComments: boolean;
  setLeftNavCollapsedForComments: (value: boolean) => void;
}

const NotesShellContext = createContext<NotesShellContextType | undefined>(undefined);

export function NotesShellProvider({ children }: { children: React.ReactNode }) {
  const [leftNavCollapsedForComments, setLeftNavCollapsedForComments] = useState(false);

  const value = useMemo(
    () => ({
      leftNavCollapsedForComments,
      setLeftNavCollapsedForComments,
    }),
    [leftNavCollapsedForComments]
  );

  return <NotesShellContext.Provider value={value}>{children}</NotesShellContext.Provider>;
}

export function useNotesShell(): NotesShellContextType {
  const ctx = useContext(NotesShellContext);
  if (!ctx) {
    throw new Error("useNotesShell deve ser usado dentro de NotesShellProvider (layout de notas).");
  }
  return ctx;
}
