import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";

export type RichEditorImageUploader = (files: File[]) => Promise<string[]>;

const STORAGE_KEY = "richEditorUiBridge" as const;

type BridgeStorage = {
  mediaEnabled: boolean;
  uploadDocumentImages: RichEditorImageUploader | null;
};

/**
 * Holds UI callbacks (e.g. image upload) so Slash suggestion ReactRenderer can read them via `editor.storage`.
 */
export const RichEditorUiBridge = Extension.create({
  name: STORAGE_KEY,

  addStorage() {
    return {
      mediaEnabled: true,
      uploadDocumentImages: null as RichEditorImageUploader | null,
    };
  },
});

export function getRichEditorImageUploader(editor: Editor): RichEditorImageUploader | null {
  const bucket = (editor.storage as unknown as Record<string, BridgeStorage | undefined>)[
    STORAGE_KEY
  ];
  return bucket?.uploadDocumentImages ?? null;
}

export function isRichEditorMediaEnabled(editor: Editor): boolean {
  const bucket = (editor.storage as unknown as Record<string, BridgeStorage | undefined>)[
    STORAGE_KEY
  ];
  return bucket?.mediaEnabled ?? true;
}
