"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

import { useParams } from "next/navigation";

import type { Note } from "@/app/_contexts/notes-context";
import { syncProjectTaskUrl } from "@/app/_utils/note-path";

export type TaskNoteModalMode = "view" | "create" | "edit";

export interface TaskNoteModalState {
  isOpen: boolean;
  mode: TaskNoteModalMode;
  noteId?: string;
  projectId?: string;
  /** Project public id for URL sync on the board (/projects/.../tasks/...). */
  projectPublicId?: string;
  stageId?: string;
  parentNoteId?: string;
}

export interface TaskNoteModalCallbacks {
  onNoteCreated?: (note: Note) => void;
  onNoteUpdated?: (note: Note) => void;
  onNoteDeleted?: (noteId: string) => void;
}

export interface TaskNoteModalContextType {
  state: TaskNoteModalState;
  callbacks: TaskNoteModalCallbacks;
  openModal: (
    mode: TaskNoteModalMode,
    options?: {
      noteId?: string;
      projectId?: string;
      projectPublicId?: string;
      stageId?: string;
      parentNoteId?: string;
      onNoteCreated?: (note: Note) => void;
      onNoteUpdated?: (note: Note) => void;
      onNoteDeleted?: (noteId: string) => void;
    }
  ) => void;
  closeModal: () => void;
  viewNote: (noteId: string) => void;
  editNote: (noteId: string) => void;
  createNote: (options?: {
    projectId?: string;
    projectPublicId?: string;
    stageId?: string;
    parentNoteId?: string;
    onNoteCreated?: (note: Note) => void;
  }) => void;
}

const TaskNoteModalContext = createContext<TaskNoteModalContextType | undefined>(undefined);

const initialState: TaskNoteModalState = {
  isOpen: false,
  mode: "view",
  noteId: undefined,
  projectId: undefined,
  projectPublicId: undefined,
  stageId: undefined,
  parentNoteId: undefined,
};

export function TaskNoteModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TaskNoteModalState>(initialState);
  const [callbacks, setCallbacks] = useState<TaskNoteModalCallbacks>({});
  const params = useParams();
  const orgId = params?.orgId as string;

  const openModal = useCallback<TaskNoteModalContextType["openModal"]>((mode, options = {}) => {
    setState({
      isOpen: true,
      mode,
      noteId: options.noteId,
      projectId: options.projectId,
      projectPublicId: options.projectPublicId,
      stageId: options.stageId,
      parentNoteId: options.parentNoteId,
    });
    setCallbacks({
      onNoteCreated: options.onNoteCreated,
      onNoteUpdated: options.onNoteUpdated,
      onNoteDeleted: options.onNoteDeleted,
    });
  }, []);

  const closeModal = useCallback(() => {
    setState((prev) => {
      if (prev.projectPublicId) {
        syncProjectTaskUrl(orgId, prev.projectPublicId, null, true);
      }
      return initialState;
    });
    setCallbacks({});
  }, [orgId]);

  const viewNote = useCallback(
    (noteId: string) => {
      openModal("view", { noteId });
    },
    [openModal]
  );

  const editNote = useCallback(
    (noteId: string) => {
      openModal("edit", { noteId });
    },
    [openModal]
  );

  const createNote = useCallback(
    (options?: {
      projectId?: string;
      projectPublicId?: string;
      stageId?: string;
      parentNoteId?: string;
      onNoteCreated?: (note: Note) => void;
    }) => {
      openModal("create", options);
    },
    [openModal]
  );

  const value = useMemo<TaskNoteModalContextType>(
    () => ({
      state,
      callbacks,
      openModal,
      closeModal,
      viewNote,
      editNote,
      createNote,
    }),
    [state, callbacks, openModal, closeModal, viewNote, editNote, createNote]
  );

  return <TaskNoteModalContext.Provider value={value}>{children}</TaskNoteModalContext.Provider>;
}

export function useTaskNoteModal(): TaskNoteModalContextType {
  const context = useContext(TaskNoteModalContext);
  if (!context) {
    throw new Error("useTaskNoteModal must be used within a TaskNoteModalProvider");
  }
  return context;
}
