"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { useChat } from "@/app/_contexts/chat-context";
import { cn } from "@/lib/utils";
import { artifactsService } from "@/app/_services";

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

export type ArtifactSandboxProps = {
  reasoningId: string;
  artifactId?: string;
  initialTitle?: string;
  initialContent?: any[];
  onDraftChange?: (state: any) => void;
};

export function ArtifactSandbox({
  reasoningId,
  artifactId,
  initialTitle = "Novo Rascunho",
  initialContent = [],
  onDraftChange,
}: ArtifactSandboxProps) {
  const { t } = useLanguage();
  const { messages } = useChat();
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<any[]>(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const targetId = artifactId || (reasoningId !== "new" ? reasoningId : null);

  // Load the initial artifact data from the backend
  useEffect(() => {

    async function loadArtifact() {
      if (!targetId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const artifact = await artifactsService.getArtifactById(targetId);
        setTitle(artifact.title || initialTitle);
        setBlocks(artifact.content || initialContent);
      } catch (error) {
        console.error("Failed to load artifact:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadArtifact();
  }, [artifactId, reasoningId]);

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
    if (!targetId) return;
    setIsSaving(true);
    try {
      const blocksToSave = updatedBlocks || blocks;
      await artifactsService.updateArtifact(targetId, {
        title,
        content: blocksToSave,
      });
    } catch (error) {
      console.error("Failed to save artifact:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("relative flex h-full flex-col border-l border-neutral-200 dark:border-surface-dark-border", "bg-white dark:bg-[#1d1d1b]")}>
      {/* Sandbox Header */}
      <div className="dark:border-surface-dark-border flex h-9 flex-shrink-0 items-center justify-between border-b border-neutral-200 px-3">
        <h1 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
          {title || "Sandbox"}
        </h1>
        {isSaving && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-orange opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-yellow"></span>
            </span>
            Salvando
          </span>
        )}
      </div>

      {/* Rich Text Editor Body */}
      <div className="custom-scrollbar flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-yellow" />
          </div>
        ) : (
          <div className="mx-auto max-w-[850px] pb-32">
            <RichTextEditor
              key={`sandbox-${artifactId || reasoningId}-${isLoading}`}
              initialBlocks={blocks}
              editable
              placeholder="A IA e você construirão este documento..."
              onChange={setBlocks}
              onSave={handleSave}
              autosave={true}
              showSaveStatus={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
