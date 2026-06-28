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

export const ArtifactExecutionCard = ({
  execution,
  onOpenSandbox,
}: {
  execution: any;
  onOpenSandbox?: (artifactId?: string) => void;
}) => {
  const { locale } = useLanguage();
  const isRunning = execution.isRunning;
  const success = execution.success;
  let title = "";

  if (execution.name === "create_artifact" || execution.name === "create_reasoning") {
    if (locale === "en-US") {
      title = isRunning ? "Creating draft" : success ? "Created draft" : "Failed to create draft";
    } else {
      title = isRunning ? "Criando rascunho" : success ? "Criou rascunho" : "Falhou ao criar rascunho";
    }
  } else {
    if (locale === "en-US") {
      title = isRunning ? "Updating draft" : success ? "Updated draft" : "Failed to update draft";
    } else {
      title = isRunning ? "Atualizando rascunho" : success ? "Atualizou rascunho" : "Falhou ao atualizar rascunho";
    }
  }

  return (
    <div className="mb-1.5 flex w-fit items-center gap-1.5 rounded-full bg-neutral-100/40 px-2.5 py-1 text-[11px] font-medium text-neutral-500 opacity-80 transition-opacity hover:opacity-100 dark:bg-neutral-800/30 dark:text-neutral-400">
      {isRunning ? (
        <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
      ) : success ? (
        <CheckCircle2 className="h-3 w-3 text-green-500/60" />
      ) : (
        <XCircle className="h-3 w-3 text-red-400/60" />
      )}
      <span>{title}</span>
      {!isRunning && success && onOpenSandbox && (
        <button
          onClick={() => onOpenSandbox(execution.result?.artifactId || execution.result?.id)}
          className="text-brand-yellow ml-1 flex items-center gap-0.5 text-[10px] font-semibold hover:underline"
        >
          {locale === "en-US" ? "Open" : "Abrir"} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export const ActionExecutionCard = ({ execution, orgId }: { execution: any; orgId: string }) => {
  const { locale } = useLanguage();
  const t =
    locale === "en-US"
      ? { success: "Success", failed: "Failed", details: "Details", open: "Open" }
      : { success: "Sucesso", failed: "Falhou", details: "Detalhes", open: "Abrir" };

  let title = execution.name;
  let link = null;

  if (execution.name === "create_note") {
    title = locale === "en-US" ? "Creating note" : "Criando nota";
    if (execution.result?.noteId) {
      link = routes.notes.details(orgId, execution.result.noteId);
    }
  } else if (execution.name.startsWith("search_")) {
    title = locale === "en-US" ? "Searching records" : "Pesquisando registros";
  } else if (execution.name.includes("update_note")) {
    title = locale === "en-US" ? "Updating note" : "Atualizando nota";
  } else if (execution.name === "consult_brain" || execution.name === "get_brain_structure") {
    title = locale === "en-US" ? "Consulting Knowledge Base" : "Consultando Base de Conhecimento";
  } else {
    // Make snake_case into human readable Title Case
    title = execution.name
      .split("_")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Adjust title tense if completed
  if (!execution.isRunning) {
    title = title
      .replace("Criando", "Criou")
      .replace("Pesquisando", "Pesquisou")
      .replace("Atualizando", "Atualizou")
      .replace("Consultando", "Consultou");
    title = title
      .replace("Creating", "Created")
      .replace("Searching", "Searched")
      .replace("Updating", "Updated")
      .replace("Consulting", "Consulted");
  }

  return (
    <div className="mb-1.5 flex w-fit items-center gap-1.5 rounded-full bg-neutral-100/40 px-2.5 py-1 text-[11px] font-medium text-neutral-500 opacity-80 transition-opacity hover:opacity-100 dark:bg-neutral-800/30 dark:text-neutral-400">
      {execution.isRunning ? (
        <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
      ) : execution.success ? (
        <CheckCircle2 className="h-3 w-3 text-green-500/60" />
      ) : (
        <XCircle className="h-3 w-3 text-red-400/60" />
      )}
      <span>{title}</span>
      {link && (
        <Link
          href={link}
          onClick={(e) => e.stopPropagation()}
          className="text-brand-yellow ml-1 flex items-center gap-0.5 text-[10px] font-semibold hover:underline"
        >
          {t.open} <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
};

export const ActionExecutionGroup = ({ executions, orgId }: { executions: any[]; orgId: string }) => {
  const [open, setOpen] = useState(false);
  const { locale } = useLanguage();

  if (!executions || executions.length === 0) return null;

  const runningCount = executions.filter((e: any) => e.isRunning).length;
  const failedCount = executions.filter((e: any) => !e.isRunning && !e.success).length;

  const text =
    locale === "en-US"
      ? `${executions.length} agent action${executions.length > 1 ? "s" : ""}`
      : `${executions.length} ${executions.length > 1 ? "ações" : "ação"} do agente`;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <div className="flex h-4 w-4 items-center justify-center">
          {runningCount > 0 ? (
            <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />
          ) : failedCount > 0 ? (
            <XCircle className="h-3 w-3 text-red-400/60" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-green-500/60" />
          )}
        </div>
        <span>{text}</span>
        {open ? (
          <ChevronUp className="h-3 w-3 text-neutral-400" />
        ) : (
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        )}
      </button>

      {open && (
        <div className="mt-1.5 ml-4 flex flex-col gap-0.5 border-l border-neutral-200/50 pl-3 dark:border-neutral-800/50">
          {executions.map((exec: any, idx: number) => (
            <ActionExecutionCard key={idx} execution={exec} orgId={orgId} />
          ))}
        </div>
      )}
    </div>
  );
};
