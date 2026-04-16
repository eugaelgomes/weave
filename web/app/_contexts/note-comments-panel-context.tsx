"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

/** Só para o layout das notas: esconder a nav esquerda no desktop quando o painel de comentários está aberto. */
export type NoteCommentsPanelContextValue = {
  commentsPanelOpen: boolean;
  setCommentsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const NoteCommentsPanelContext = createContext<NoteCommentsPanelContextValue | undefined>(
  undefined
);

export function NoteCommentsPanelProvider({ children }: { children: React.ReactNode }) {
  const [commentsPanelOpen, setCommentsPanelOpen] = useState(false);
  const value = useMemo(() => ({ commentsPanelOpen, setCommentsPanelOpen }), [commentsPanelOpen]);
  return (
    <NoteCommentsPanelContext.Provider value={value}>{children}</NoteCommentsPanelContext.Provider>
  );
}

export function useNoteCommentsPanel(): NoteCommentsPanelContextValue {
  const ctx = useContext(NoteCommentsPanelContext);
  if (!ctx) {
    throw new Error("useNoteCommentsPanel deve ser usado dentro de NoteCommentsPanelProvider.");
  }
  return ctx;
}
