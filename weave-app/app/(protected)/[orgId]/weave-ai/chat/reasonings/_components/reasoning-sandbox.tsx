"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { useChat } from "@/app/_contexts/chat-context";
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
  artifactId?: string;
  initialTitle?: string;
  initialContent?: any[];
  onDraftChange?: (state: any) => void;
};

export function ReasoningSandbox({
  reasoningId,
  artifactId,
  initialTitle = "Novo Rascunho",
  initialContent = [],
  onDraftChange,
}: ReasoningSandboxProps) {
  const { t } = useLanguage();
  const { messages } = useChat();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<any[]>(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load the initial artifact data from the backend
  useEffect(() => {
    const targetId = artifactId || (reasoningId !== "new" ? reasoningId : null);

    async function loadArtifact() {
      if (!targetId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/v1/artifacts/${targetId}`);
        if (response.ok) {
          const artifact = await response.json();
          setTitle(artifact.title || initialTitle);
          setBlocks(artifact.content || initialContent);
        }
      } catch (error) {
        console.error("Failed to load artifact:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadArtifact();
  }, [artifactId, reasoningId, initialTitle, initialContent]);

  // Sync content from the latest AI function calls
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];

    // Check if it's an assistant message with functions
    if (lastMsg.role === "assistant" && Array.isArray(lastMsg.functions)) {
      const sandboxCall = lastMsg.functions.find(
        (f: any) => f.name === "create_artifact" || f.name === "update_artifact"
      );

      if (sandboxCall && sandboxCall.arguments) {
        let argsObj = sandboxCall.arguments;
        // In case the arguments are passed as a JSON string, parse them
        if (typeof argsObj === "string") {
          try {
            argsObj = JSON.parse(argsObj);
          } catch (e) {}
        }

        if (argsObj && Array.isArray(argsObj.blocks) && argsObj.blocks.length > 0) {
          setBlocks(argsObj.blocks);
        }
        if (argsObj && argsObj.title && typeof argsObj.title === "string") {
          setTitle(argsObj.title);
        }
      }
    }
  }, [messages]);

  useEffect(() => {
    onDraftChange?.({
      title,
      blocksCount: blocks.length,
      // Pass the raw content or a text version if needed by the chat
      content: blocks,
    });
  }, [title, blocks, onDraftChange]);

  const handleSave = async (updatedBlocks?: any[]) => {
    setIsSaving(true);
    try {
      const blocksToSave = updatedBlocks || blocks;
      await fetch(`/api/v1/artifacts/${reasoningId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: blocksToSave }),
      });
    } catch (error) {
      console.error("Failed to save artifact:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
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
          <div className="flex items-center gap-2">
            {isSaving && <span className="text-xs text-neutral-400">Salvando...</span>}
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className={cn(
                engineSubmitButtonClass,
                "rounded-lg px-4 py-1.5 text-xs whitespace-nowrap"
              )}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Salvar"}
            </button>
          </div>
        </div>

        {/* Rich Text Editor Body */}
        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto max-w-[700px]">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
              </div>
            ) : (
              <RichTextEditor
                key={`sandbox-${artifactId || reasoningId}-${isLoading}`}
                initialBlocks={blocks}
                editable
                placeholder="A IA e você construirão este documento..."
                onChange={setBlocks}
                onSave={handleSave}
                autosave={true}
                showSaveStatus={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
