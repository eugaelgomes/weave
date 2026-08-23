import React, { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/app/_contexts/language-context";
import { routes } from "@/app/_utils/routes";

export const ToolCallGroup = ({
  toolCalls,
  allMessages,
  onOpenSandbox,
}: {
  toolCalls: any[];
  allMessages: any[];
  onOpenSandbox?: (artifactId?: string) => void;
}) => {
  const { locale } = useLanguage();

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mb-2 flex flex-col gap-1.5 pl-2">
      <style>{`
        @keyframes radio-wave {
          0%, 100% { opacity: 0.2; transform: scaleY(0.5); }
          50% { opacity: 1; transform: scaleY(1); }
        }
        .animate-radio-wave {
          display: inline-block;
          width: 2px;
          height: 8px;
          background-color: currentColor;
          margin: 0 1px;
          border-radius: 2px;
          animation: radio-wave 1.2s ease-in-out infinite;
        }
      `}</style>
      {toolCalls.map((tc, idx) => {
        const toolMsg = allMessages.find((m: any) => m.role === "tool" && m.tool_call_id === tc.id);
        const isRunning = !toolMsg;
        const resultObj = toolMsg?.content
          ? (() => {
              try {
                return JSON.parse(toolMsg.content);
              } catch {
                return { error: "Failed to parse" };
              }
            })()
          : null;
        const success = toolMsg && !resultObj?.error && toolMsg.status !== "error";

        // Mapeamento de texto via I18n fallback manual (já que t.weaveAi pode não ter tudo)
        const name = tc?.function?.name || tc?.name || "tool";
        let title = "";

        if (name === "create_artifact" || name === "create_reasoning") {
          title = locale === "en-US" ? "Creating draft" : "Criando rascunho";
          if (!isRunning)
            title = success
              ? locale === "en-US"
                ? "Draft created"
                : "Rascunho criado"
              : locale === "en-US"
                ? "Failed to create draft"
                : "Falha ao criar rascunho";
        } else if (name === "update_artifact" || name === "update_reasoning_draft") {
          title = locale === "en-US" ? "Updating draft" : "Atualizando rascunho";
          if (!isRunning)
            title = success
              ? locale === "en-US"
                ? "Draft updated"
                : "Rascunho atualizado"
              : locale === "en-US"
                ? "Failed to update draft"
                : "Falha ao atualizar rascunho";
        } else if (name === "create_note") {
          title = locale === "en-US" ? "Creating note" : "Criando nota";
          if (!isRunning)
            title = success
              ? locale === "en-US"
                ? "Note created"
                : "Nota criada"
              : locale === "en-US"
                ? "Failed to create note"
                : "Falha ao criar nota";
        } else if (name.startsWith("search_")) {
          title = locale === "en-US" ? "Searching records" : "Buscando registros";
          if (!isRunning)
            title = success
              ? locale === "en-US"
                ? "Search completed"
                : "Busca concluída"
              : locale === "en-US"
                ? "Search failed"
                : "Falha na busca";
        } else if (name === "consult_brain" || name === "get_brain_structure") {
          title =
            locale === "en-US" ? "Consulting Knowledge Base" : "Consultando Base de Conhecimento";
          if (!isRunning)
            title = success
              ? locale === "en-US"
                ? "Knowledge Base consulted"
                : "Base de Conhecimento consultada"
              : locale === "en-US"
                ? "Failed to consult Knowledge Base"
                : "Falha ao consultar Base de Conhecimento";
        } else {
          const rawName = name
            .split("_")
            .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          title = isRunning
            ? locale === "en-US"
              ? `Running ${rawName}`
              : `Rodando ${rawName}`
            : success
              ? locale === "en-US"
                ? `${rawName} completed`
                : `${rawName} concluído`
              : locale === "en-US"
                ? `${rawName} failed`
                : `${rawName} falhou`;
        }

        const artifactId = resultObj?.artifactId || resultObj?.id;
        const noteId = resultObj?.noteId;

        return (
          <div
            key={idx}
            className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-neutral-400 dark:text-neutral-500"
          >
            <span
              className={
                isRunning
                  ? "text-brand-yellow animate-pulse"
                  : success
                    ? "text-neutral-500 dark:text-neutral-400"
                    : "text-red-400/80"
              }
            >
              {title.toLowerCase()}
            </span>

            {isRunning && (
              <div className="text-brand-yellow flex items-center">
                <span className="animate-radio-wave" style={{ animationDelay: "0ms" }}></span>
                <span className="animate-radio-wave" style={{ animationDelay: "150ms" }}></span>
                <span className="animate-radio-wave" style={{ animationDelay: "300ms" }}></span>
              </div>
            )}

            {!isRunning &&
              success &&
              (name === "create_artifact" ||
                name === "update_artifact" ||
                name === "create_reasoning" ||
                name === "update_reasoning_draft") &&
              artifactId &&
              onOpenSandbox && (
                <button
                  onClick={() => onOpenSandbox(artifactId)}
                  className="text-brand-yellow ml-1 text-[10px] font-bold tracking-wider uppercase hover:underline"
                >
                  [{locale === "en-US" ? "open" : "abrir"}]
                </button>
              )}

            {!isRunning && success && name === "create_note" && noteId && (
              <Link
                href={routes.notes.details(noteId)}
                className="text-brand-yellow ml-1 text-[10px] font-bold tracking-wider uppercase hover:underline"
              >
                [{locale === "en-US" ? "open" : "abrir"}]
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
};
