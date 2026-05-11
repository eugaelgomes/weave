import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

export type NoteEditorImageUploader = (files: File[]) => Promise<string[]>;

const STORAGE_KEY = "noteEditorUiBridge" as const;

type BridgeStorage = {
  uploadDocumentImages: NoteEditorImageUploader | null;
};

/**
 * Holds UI callbacks (e.g. image upload) so Slash suggestion ReactRenderer can read them via `editor.storage`.
 */
export const NoteEditorUiBridge = Extension.create({
  name: STORAGE_KEY,

  addStorage() {
    return {
      uploadDocumentImages: null as NoteEditorImageUploader | null,
    };
  },
});

export function getNoteEditorImageUploader(editor: Editor): NoteEditorImageUploader | null {
  const bucket = (editor.storage as unknown as Record<string, BridgeStorage | undefined>)[
    STORAGE_KEY
  ];
  return bucket?.uploadDocumentImages ?? null;
}
