"use client";

import React, { useCallback } from "react";
import type { Block, CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import { uploadNoteDocumentImages } from "@/app/_services/notes-service/notes-service";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { RichTextEditor } from "@/app/(protected)/_components/rich-editor/rich-editor";

interface NoteTiptapEditorProps {
  initialBlocks: Block[];
  noteId: string;
  canEdit: boolean;
  onSave: (blocks: CreateBlockData[]) => Promise<void>;
}

export function NoteTiptapEditor({
  initialBlocks,
  noteId,
  canEdit,
  onSave,
}: NoteTiptapEditorProps) {
  const uploadImages = useCallback(
    async (files: File[]) => {
      const { files: uploaded } = await uploadNoteDocumentImages(noteId, files);
      return uploaded.map((f) => getStorageUrl(f.path));
    },
    [noteId]
  );

  return (
    <RichTextEditor
      initialBlocks={initialBlocks}
      editable={canEdit}
      onSave={onSave}
      uploadImages={uploadImages}
      autosave
      showSaveStatus
    />
  );
}
