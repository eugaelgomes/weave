"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { engineSubmitButtonClass } from "@/app/(protected)/[orgId]/weave-engine/_components/engine-styles";
import { cn } from "@/lib/utils";

const RichTextEditor = dynamic(
  () =>
    import("@/app/(protected)/_components/rich-editor/rich-editor").then((m) => m.RichTextEditor),
  {
    loading: () => (
      <div className="flex min-h-[120px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    ),
    ssr: false,
  }
);

export type ReasoningSandboxProps = {
  reasoningId: string;
  initialTitle?: string;
  initialContent?: any[];
  onDraftChange?: (state: any) => void;
};

export function ReasoningSandbox({
  reasoningId,
  initialTitle = "Novo Rascunho",
  initialContent = [],
  onDraftChange,
}: ReasoningSandboxProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<any[]>(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    onDraftChange?.({
      title,
      blocksCount: blocks.length,
      // Pass the raw content or a text version if needed by the chat
      content: blocks,
    });
  }, [title, blocks, onDraftChange]);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Connect to backend to save reasoning
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="flex h-full flex-col bg-neutral-50 p-4 dark:bg-[#111111]">
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-2xl dark:border-neutral-800/80 dark:bg-[#18181a]">
        {/* Sandbox Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-3 dark:border-neutral-800/60">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do Reasoning..."
            className="w-full bg-transparent text-[15px] font-semibold text-neutral-800 outline-none placeholder:text-neutral-300 dark:text-neutral-100 dark:placeholder:text-neutral-600"
          />
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(engineSubmitButtonClass, "whitespace-nowrap px-4 py-1.5 text-xs rounded-lg")}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
          </button>
        </div>

        {/* Rich Text Editor Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-[700px]">
            <RichTextEditor
              key={`sandbox-${reasoningId}`}
              initialBlocks={blocks}
              editable
              placeholder="A IA e você construirão este documento..."
              onChange={setBlocks}
              autosave={false}
              showSaveStatus={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
