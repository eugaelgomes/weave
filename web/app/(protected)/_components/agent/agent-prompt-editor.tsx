"use client";

import React, { useMemo } from "react";
import { RichTextEditor } from "@/app/(protected)/_components/rich-editor/rich-editor";
import {
  type PromptDocument,
  promptDocumentToEditorBlocks,
} from "@/app/(protected)/_components/agent/agent-prompt-document";

interface AgentPromptEditorProps {
  document: PromptDocument;
  version: number;
  onChange: (document: PromptDocument) => void;
}

export function AgentPromptEditor({ document, version, onChange }: AgentPromptEditorProps) {
  const initialBlocks = useMemo(() => promptDocumentToEditorBlocks(document), [document]);

  return (
    <RichTextEditor
      key={version}
      initialBlocks={initialBlocks}
      editable
      autosave={false}
      mediaEnabled={false}
      placeholder="Defina a persona, diretrizes, regras, tom e restrições do agente. Use / para abrir os comandos de formatação."
      className="min-h-[280px] py-1 [&_.ProseMirror]:min-h-[240px]"
      onChange={onChange}
    />
  );
}
