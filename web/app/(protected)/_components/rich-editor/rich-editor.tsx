"use client";

import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

import type { Block, CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import { createRichEditorExtensions } from "@/app/(protected)/_components/rich-editor/rich-editor-extensions";
import {
  blocksToTiptapDoc,
  tiptapDocToBlocks,
} from "@/app/(protected)/_components/rich-editor/rich-editor-serializer";
import {
  RichEditorBubbleMenu,
  RichEditorFloatingMenu,
} from "@/app/(protected)/_components/rich-editor/rich-editor-menu";
import { TiptapDragHandle } from "@/app/(protected)/_components/rich-editor/rich-editor-drag-handle";
import {
  getClipboardImagesForUpload,
  sanitizePastedHtml,
} from "@/app/(protected)/_components/rich-editor/rich-editor-paste";
import "./rich-editor-styles.css";

export type RichTextEditorHandle = {
  getBlocks: () => CreateBlockData[];
  flushSave: () => Promise<void>;
};

export type RichTextEditorProps = {
  initialBlocks?: Block[];
  editable?: boolean;
  placeholder?: string;
  onChange?: (blocks: CreateBlockData[]) => void;
  onSave?: (blocks: CreateBlockData[]) => Promise<void>;
  uploadImages?: (files: File[]) => Promise<string[]>;
  autosave?: boolean;
  showSaveStatus?: boolean;
  mediaEnabled?: boolean;
  className?: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";
const AUTOSAVE_DELAY_MS = 1200;

function createBlocksSnapshot(blocks: CreateBlockData[]): string {
  const normalized = blocks.map((block) => ({
    done: block.done ?? null,
    parentId: block.parentId ?? null,
    position: block.position ?? null,
    properties: block.properties ?? null,
    text: block.text ?? "",
    type: block.type,
    children: Array.isArray((block as { children?: unknown[] }).children)
      ? (block as { children?: unknown[] }).children
      : [],
  }));
  return JSON.stringify(normalized);
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor(
    {
      initialBlocks = [],
      editable = true,
      placeholder,
      onChange,
      onSave,
      uploadImages,
      autosave = Boolean(onSave),
      showSaveStatus = Boolean(onSave),
      mediaEnabled = true,
      className,
    },
    ref
  ) {
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const saveTimeoutRef = useRef<number | null>(null);
    const saveInFlightRef = useRef(false);
    const pendingSaveRef = useRef<CreateBlockData[] | null>(null);
    const lastSavedJsonRef = useRef<string>("");
    const editorRef = useRef<Editor | null>(null);
    const hasPendingTimeoutRef = useRef(false);

    const emitChange = useCallback(
      (blocks: CreateBlockData[]) => {
        onChange?.(blocks);
      },
      [onChange]
    );

    const flushSave = useCallback(
      async (blocks: CreateBlockData[]) => {
        emitChange(blocks);

        if (!onSave) return;

        if (saveInFlightRef.current) {
          pendingSaveRef.current = blocks;
          return;
        }

        const currentSnapshot = createBlocksSnapshot(blocks);
        if (currentSnapshot === lastSavedJsonRef.current) {
          return;
        }

        saveInFlightRef.current = true;
        setSaveStatus("saving");

        try {
          await onSave(blocks);
          lastSavedJsonRef.current = currentSnapshot;
          setSaveStatus("saved");
          setTimeout(() => {
            setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
          }, 2000);
        } catch (error) {
          console.error("Rich editor save failed:", error);
          setSaveStatus("error");
        } finally {
          saveInFlightRef.current = false;
          if (pendingSaveRef.current) {
            const pending = pendingSaveRef.current;
            pendingSaveRef.current = null;
            void flushSave(pending);
          }
        }
      },
      [onSave, emitChange]
    );

    const uploadImagesRef = useRef(uploadImages);
    uploadImagesRef.current = uploadImages;

    const editableRef = useRef(editable);
    editableRef.current = editable;

    const scheduleAutosave = useCallback(
      (editor: Editor) => {
        if (!autosave) {
          const blocks = tiptapDocToBlocks(editor.getJSON());
          emitChange(blocks);
          return;
        }

        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
        }
        hasPendingTimeoutRef.current = true;

        saveTimeoutRef.current = window.setTimeout(() => {
          hasPendingTimeoutRef.current = false;
          const doc = editor.getJSON();
          const blocks = tiptapDocToBlocks(doc);
          void flushSave(blocks);
        }, AUTOSAVE_DELAY_MS);
      },
      [autosave, flushSave, emitChange]
    );

    const scheduleAutosaveRef = useRef(scheduleAutosave);
    scheduleAutosaveRef.current = scheduleAutosave;

    const handleImmediateSave = useCallback(() => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        hasPendingTimeoutRef.current = false;
      }

      if (editorRef.current) {
        const blocks = tiptapDocToBlocks(editorRef.current.getJSON());
        void flushSave(blocks);
      }
    }, [flushSave]);

    useImperativeHandle(
      ref,
      () => ({
        getBlocks: () => {
          if (!editorRef.current || editorRef.current.isDestroyed) return [];
          return tiptapDocToBlocks(editorRef.current.getJSON());
        },
        flushSave: async () => {
          handleImmediateSave();
        },
      }),
      [handleImmediateSave]
    );

    const editor = useEditor({
      extensions: createRichEditorExtensions(placeholder),
      content: blocksToTiptapDoc(initialBlocks),
      editable,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => {
        if (editable) {
          scheduleAutosave(ed);
        }
      },
      editorProps: {
        attributes: {
          class: "tiptap-editor",
        },
        transformPastedHTML: sanitizePastedHtml,
        handlePaste(_view: EditorView, event: ClipboardEvent) {
          if (!editableRef.current) return false;
          const data = event.clipboardData;
          if (!data) return false;
          const imageFiles = getClipboardImagesForUpload(data);
          if (!mediaEnabled || !imageFiles || imageFiles.length === 0) return false;

          event.preventDefault();

          if (!uploadImagesRef.current) {
            toast.info("Image upload is not available in this editor.");
            return true;
          }

          void (async () => {
            try {
              const urls = await uploadImagesRef.current!(imageFiles);
              const ed = editorRef.current;
              if (!ed || ed.isDestroyed) return;

              const toInsert: JSONContent[] = [];
              urls.forEach((src, index) => {
                if (index > 0) toInsert.push({ type: "paragraph" });
                toInsert.push({ type: "image", attrs: { src, alt: "" } });
              });

              ed.chain().focus().insertContent(toInsert).run();
              scheduleAutosaveRef.current(ed);
            } catch (error) {
              console.error("Rich editor image paste failed:", error);
              toast.error("Could not upload pasted image(s).");
            }
          })();

          return true;
        },
      },
    });

    useEffect(() => {
      editorRef.current = editor;
    }, [editor]);

    useEffect(() => {
      if (!editor || editor.isDestroyed) return;
      const bridge = (
        editor.storage as {
          richEditorUiBridge?: {
            mediaEnabled: boolean;
            uploadDocumentImages: typeof uploadImages | null;
          };
        }
      ).richEditorUiBridge;
      if (!bridge) return;
      bridge.mediaEnabled = mediaEnabled;
      bridge.uploadDocumentImages = uploadImages ?? null;
      return () => {
        if (!editor.isDestroyed) {
          bridge.mediaEnabled = true;
          bridge.uploadDocumentImages = null;
        }
      };
    }, [editor, mediaEnabled, uploadImages]);

    useEffect(() => {
      if (!editable || !onSave) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          void handleImmediateSave();
        }
      };

      const handleBeforeUnload = () => {
        void handleImmediateSave();
      };

      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }, [editable, onSave, handleImmediateSave]);

    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
        }
        hasPendingTimeoutRef.current = false;
      };
    }, []);

    useEffect(() => {
      if (lastSavedJsonRef.current) return;
      lastSavedJsonRef.current = createBlocksSnapshot(
        tiptapDocToBlocks(blocksToTiptapDoc(initialBlocks))
      );
    }, [initialBlocks]);

    useEffect(() => {
      if (editor && !editor.isDestroyed) {
        const newContent = blocksToTiptapDoc(initialBlocks);
        const currentJson = JSON.stringify(editor.getJSON());
        const newJson = JSON.stringify(newContent);
        const currentSnapshot = createBlocksSnapshot(tiptapDocToBlocks(editor.getJSON()));
        const hasLocalDirtyDraft =
          currentSnapshot !== lastSavedJsonRef.current ||
          hasPendingTimeoutRef.current ||
          saveInFlightRef.current ||
          pendingSaveRef.current !== null;

        if (currentJson !== newJson && !hasLocalDirtyDraft) {
          editor.commands.setContent(newContent);
          lastSavedJsonRef.current = createBlocksSnapshot(tiptapDocToBlocks(newContent));
        }
      }
    }, [initialBlocks, editor]);

    useEffect(() => {
      if (editor && !editor.isDestroyed) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    if (!editor) {
      return (
        <div className="flex min-h-[120px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      );
    }

    return (
      <div
        className={
          className
            ? `tiptap-editor-wrapper relative ${className}`
            : "tiptap-editor-wrapper relative"
        }
      >
        {editable && <RichEditorBubbleMenu editor={editor} mediaEnabled={mediaEnabled} />}
        {editable && <RichEditorFloatingMenu editor={editor} mediaEnabled={mediaEnabled} />}
        {editable && <TiptapDragHandle editor={editor} />}

        <EditorContent editor={editor} />

        {showSaveStatus && editable && onSave && (
          <div className="absolute -top-8 right-0 flex items-center gap-1.5 text-xs text-neutral-400">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check className="h-3 w-3 text-green-500" />
                <span className="text-green-500">Saved</span>
              </>
            )}
            {saveStatus === "error" && <span className="text-red-500">Save failed</span>}
          </div>
        )}
      </div>
    );
  }
);
