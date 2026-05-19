"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { Note, Block } from "@/app/_contexts/notes-context";
import type { TaskNoteModalMode } from "./use-task-note-modal";
import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";

const NoteTiptapEditor = dynamic(
  () =>
    import("@/app/(protected)/notes/[id]/_components/note-tiptap-editor").then(
      (mod) => mod.NoteTiptapEditor
    ),
  {
    loading: () => (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    ),
    ssr: false,
  }
);

interface TaskNoteModalContentProps {
  mode: TaskNoteModalMode;
  note: Note | null;
  blocks: (Block & { children?: Block[] })[];
  editingTitle: string;
  editingDescription: string;
  canEdit: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onBlocksSave: (blocks: CreateBlockData[]) => Promise<void>;
}

export function TaskNoteModalContent({
  mode,
  note,
  blocks,
  editingTitle,
  editingDescription,
  canEdit,
  onTitleChange,
  onDescriptionChange,
  onBlocksSave,
}: TaskNoteModalContentProps) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [editingTitle]);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = "auto";
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [editingDescription]);

  const showEditor = mode !== "create" && note;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
      <div className="mb-4">
        <textarea
          ref={titleRef}
          value={editingTitle}
          onChange={(e) => {
            onTitleChange(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder="Título da tarefa..."
          rows={1}
          readOnly={!canEdit}
          className={`w-full resize-none overflow-hidden bg-transparent text-lg font-bold text-neutral-900 placeholder-neutral-300 outline-none transition-colors dark:text-neutral-100 dark:placeholder-neutral-600 ${
            canEdit
              ? "focus:placeholder-neutral-400 dark:focus:placeholder-neutral-500"
              : "cursor-default"
          }`}
        />
        <textarea
          ref={descriptionRef}
          value={editingDescription}
          onChange={(e) => {
            onDescriptionChange(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          placeholder="Adicionar descrição..."
          rows={1}
          readOnly={!canEdit}
          className={`w-full resize-none overflow-hidden bg-transparent text-xs text-neutral-600 placeholder-neutral-300 outline-none transition-colors dark:text-neutral-400 dark:placeholder-neutral-600 ${
            canEdit
              ? "focus:placeholder-neutral-400 dark:focus:placeholder-neutral-500"
              : "cursor-default"
          }`}
        />
      </div>

      {showEditor && (
        <div className="min-h-0 flex-1">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <NoteTiptapEditor
              initialBlocks={blocks}
              noteId={note.id}
              canEdit={canEdit}
              onSave={onBlocksSave}
            />
          </div>
        </div>
      )}

      {mode === "create" && (
        <div className="flex-1 rounded-lg border border-dashed border-neutral-200 p-4 dark:border-surface-dark-border">
          <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
            Após criar a tarefa, você poderá adicionar conteúdo rico com o editor.
          </p>
        </div>
      )}
    </div>
  );
}
