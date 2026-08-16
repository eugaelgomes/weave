"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import type { Note, Block } from "@/app/_contexts/notes-context";
import type { TaskNoteModalMode } from "@/app/(protected)/_components/task-note-modal/use-task-note-modal";
import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import { RichTextEditor } from "@/app/(protected)/_components/rich-editor/rich-editor";

const NoteTiptapEditor = dynamic(
  () =>
    import("@/app/(protected)/notes/[public_id]/_components/note-tiptap-editor").then(
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
  createBlocks?: CreateBlockData[];
  onCreateBlocksChange?: (blocks: CreateBlockData[]) => void;
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
  createBlocks = [],
  onCreateBlocksChange,
}: TaskNoteModalContentProps) {
  const showEditor = mode !== "create" && note;

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
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

      {mode === "create" && onCreateBlocksChange && (
        <div className="min-h-0 flex-1">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <RichTextEditor
              initialBlocks={createBlocks}
              editable
              onChange={onCreateBlocksChange}
              autosave={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}
