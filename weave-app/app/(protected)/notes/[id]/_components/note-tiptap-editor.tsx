"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Loader2, Check } from "lucide-react";

import type { Block, CreateBlockData } from "@/app/_services/notes-service/notes.schema";
import { createTiptapExtensions } from "./note-tiptap-extensions";
import { blocksToTiptapDoc, tiptapDocToBlocks, isDocumentEmpty } from "./note-tiptap-serializer";
import { NoteTiptapBubbleMenu } from "./note-tiptap-menu";
import { TiptapDragHandle } from "./note-tiptap-drag-handle";
import "./note-tiptap-styles.css";

interface NoteTiptapEditorProps {
  initialBlocks: Block[];
  noteId: string;
  canEdit: boolean;
  onSave: (blocks: CreateBlockData[]) => Promise<void>;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

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

export function NoteTiptapEditor({
  initialBlocks,
  noteId,
  canEdit,
  onSave,
}: NoteTiptapEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimeoutRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef<CreateBlockData[] | null>(null);
  const lastSavedJsonRef = useRef<string>("");
  const editorRef = useRef<Editor | null>(null);

  const flushSave = useCallback(
    async (blocks: CreateBlockData[]) => {
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
        console.error("Erro ao salvar blocos:", error);
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
    [onSave]
  );

  const scheduleAutosave = useCallback(
    (editor: Editor) => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(() => {
        const doc = editor.getJSON();
        const blocks = tiptapDocToBlocks(doc);
        void flushSave(blocks);
      }, 3500);
    },
    [flushSave]
  );

  const handleImmediateSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (editorRef.current) {
      const doc = editorRef.current.getJSON();
      const blocks = tiptapDocToBlocks(doc);
      void flushSave(blocks);
    }
  }, [flushSave]);

  const editor = useEditor({
    extensions: createTiptapExtensions(),
    content: blocksToTiptapDoc(initialBlocks),
    editable: canEdit,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (canEdit) {
        scheduleAutosave(editor);
      }
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!canEdit) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleImmediateSave();
      }
    };

    const handleBeforeUnload = () => {
      handleImmediateSave();
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [canEdit, handleImmediateSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const newContent = blocksToTiptapDoc(initialBlocks);
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(newContent);

      if (currentJson !== newJson && !saveInFlightRef.current) {
        editor.commands.setContent(newContent);
        lastSavedJsonRef.current = createBlocksSnapshot(tiptapDocToBlocks(newContent));
      }
    }
  }, [initialBlocks, editor]);

  if (!editor) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="tiptap-editor-wrapper relative">
      {canEdit && editor && <NoteTiptapBubbleMenu editor={editor} />}
      {canEdit && editor && <TiptapDragHandle editor={editor} />}

      <EditorContent editor={editor} />

      {canEdit && (
        <div className="absolute -top-8 right-0 flex items-center gap-1.5 text-xs text-neutral-400">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Salvando...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-green-500">Salvo</span>
            </>
          )}
          {saveStatus === "error" && (
            <span className="text-red-500">Erro ao salvar</span>
          )}
        </div>
      )}
    </div>
  );
}
