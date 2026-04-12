"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createNoteComment as createNoteCommentService,
  deleteNoteComment as deleteNoteCommentService,
  fetchNoteComments,
  updateNoteComment as updateNoteCommentService,
  uploadNoteCommentAttachments,
  type CreateNoteCommentBody,
  type NoteComment,
  type NoteCommentFile,
  type UpdateNoteCommentBody,
} from "../_services/notes-comments-service/notes-comments-service";

export interface NoteCommentsContextType {
  comments: NoteComment[];
  error: string | null;
  loading: boolean;
  refreshComments: (opts?: { silent?: boolean }) => Promise<void>;
  createComment: (body: CreateNoteCommentBody) => Promise<void>;
  updateComment: (commentId: string, body: UpdateNoteCommentBody) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  uploadAttachments: (files: File[]) => Promise<NoteCommentFile[]>;
}

const NoteCommentsContext = createContext<NoteCommentsContextType | undefined>(undefined);

export function useNoteComments(): NoteCommentsContextType {
  const ctx = useContext(NoteCommentsContext);
  if (!ctx) {
    throw new Error("useNoteComments deve ser usado dentro de NoteCommentsProvider");
  }
  return ctx;
}

export function NoteCommentsProvider({
  noteId,
  children,
}: {
  noteId: string;
  children: React.ReactNode;
}) {
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshComments = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!noteId) return;
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await fetchNoteComments(noteId);
        setComments(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar comentários");
        console.error("Erro ao carregar comentários:", err);
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [noteId]
  );

  useEffect(() => {
    void refreshComments();
  }, [refreshComments]);

  const createComment = useCallback(
    async (body: CreateNoteCommentBody) => {
      await createNoteCommentService(noteId, body);
      await refreshComments({ silent: true });
    },
    [noteId, refreshComments]
  );

  const updateComment = useCallback(
    async (commentId: string, body: UpdateNoteCommentBody) => {
      await updateNoteCommentService(noteId, commentId, body);
      await refreshComments({ silent: true });
    },
    [noteId, refreshComments]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      await deleteNoteCommentService(noteId, commentId);
      await refreshComments({ silent: true });
    },
    [noteId, refreshComments]
  );

  const uploadAttachments = useCallback(
    async (files: File[]) => uploadNoteCommentAttachments(noteId, files),
    [noteId]
  );

  const value = useMemo(
    () => ({
      comments,
      createComment,
      deleteComment,
      error,
      loading,
      refreshComments,
      updateComment,
      uploadAttachments,
    }),
    [
      comments,
      createComment,
      deleteComment,
      error,
      loading,
      refreshComments,
      updateComment,
      uploadAttachments,
    ]
  );

  return <NoteCommentsContext.Provider value={value}>{children}</NoteCommentsContext.Provider>;
}
