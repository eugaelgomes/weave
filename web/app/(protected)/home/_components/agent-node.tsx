"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Globe,
  Code2,
  Image as ImageIcon,
  Settings2,
  ExternalLink,
  Power,
  Trash2,
  Cpu,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useAgent, type Agent } from "@/app/_contexts/agent-context";
import { cn } from "@/lib/utils";

interface AgentNodeProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
}

const PROVIDER_METAS: Record<string, { label: string; chip: string; dot: string }> = {
  gemini: {
    label: "Google Gemini",
    chip: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300 dark:border-sky-500/30",
    dot: "bg-sky-500",
  },
  perplexity: {
    label: "Perplexity",
    chip: "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:text-amber-200 dark:border-amber-500/25",
    dot: "bg-amber-500",
  },
  openai: {
    label: "OpenAI",
    chip: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  claude: {
    label: "Anthropic Claude",
    chip: "bg-orange-500/10 text-orange-800 border-orange-500/20 dark:text-orange-200 dark:border-orange-500/25",
    dot: "bg-orange-500",
  },
};

export default function AgentNode({ agent, onEdit }: AgentNodeProps) {
  const router = useRouter();
  const { toggleAgentActive, deleteAgent } = useAgent();
  const [isToggling, setIsToggling] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = PROVIDER_METAS[agent.model_provider?.toLowerCase()] ?? PROVIDER_METAS.gemini;
  const isActive = agent.is_active ?? true;

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsToggling(true);
    try {
      await toggleAgentActive(agent.id, !isActive);
      toast.success(isActive ? "Agente pausado." : "Agente ativado no quadro.");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao alterar status do agente.");
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteAgent(agent.id);
      toast.success(`Agente "${agent.name}" excluído.`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir agente.");
    }
  };

  const hasTool = (toolName: string) => agent.tools?.includes(toolName);

  return (
    <div
      data-canvas-interactive="true"
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border bg-white/95 p-5 shadow-md backdrop-blur-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-xl",
        isActive
          ? "border-neutral-200/90 dark:border-neutral-700/80 dark:bg-neutral-900/95"
          : "border-dashed border-neutral-300 opacity-80 dark:border-neutral-700 dark:bg-neutral-900/60"
      )}
    >
      {/* Node Frame Top Label */}
      <div className="absolute -top-3 left-4 flex items-center gap-1.5 rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white shadow-sm dark:bg-white dark:text-neutral-900">
        <Layers size={10} className="stroke-[2.5]" />
        <span>Agente</span>
        <span className="opacity-50">·</span>
        <span className="max-w-[120px] truncate">{agent.name}</span>
      </div>

      {/* Header: Avatar, Name & Status */}
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl shadow-inner transition",
              isActive
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"
            )}
          >
            <Bot size={22} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                {agent.name}
              </h3>
              <div
                title={isActive ? "Agente Ativo" : "Agente Inativo"}
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  isActive
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                    : "bg-neutral-300 dark:bg-neutral-600"
                )}
              />
            </div>
            <p className="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">
              {agent.role || "Assistente"}
            </p>
          </div>
        </div>

        {/* Status Toggle Button */}
        <button
          type="button"
          disabled={isToggling}
          onClick={handleToggleActive}
          title={isActive ? "Desativar agente" : "Ativar agente"}
          className={cn(
            "flex size-7 items-center justify-center rounded-lg border transition",
            isActive
              ? "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              : "border-neutral-300 bg-neutral-100 text-neutral-400 hover:text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500"
          )}
        >
          <Power size={13} className={isActive ? "text-emerald-500" : ""} />
        </button>
      </div>

      {/* Model & Provider Info */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
            meta.chip
          )}
        >
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>

        <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] text-neutral-600 dark:border-neutral-700/80 dark:bg-neutral-800/80 dark:text-neutral-300">
          <Cpu size={10} />
          {agent.model_name || "gemini-flash"}
        </span>
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
        {agent.description || "Nenhuma descrição fornecida para este agente."}
      </p>

      {/* Capabilities Badges */}
      <div className="mt-4 flex items-center gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
          Ferramentas:
        </span>
        <div className="flex items-center gap-1">
          <span
            title="Busca na Web"
            className={cn(
              "flex size-6 items-center justify-center rounded-md border transition",
              hasTool("web_search")
                ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                : "border-neutral-200 bg-neutral-100 text-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-600"
            )}
          >
            <Globe size={12} />
          </span>

          <span
            title="Interpretador de Código"
            className={cn(
              "flex size-6 items-center justify-center rounded-md border transition",
              hasTool("code_interpreter")
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-neutral-200 bg-neutral-100 text-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-600"
            )}
          >
            <Code2 size={12} />
          </span>

          <span
            title="Geração de Imagens"
            className={cn(
              "flex size-6 items-center justify-center rounded-md border transition",
              hasTool("image_generation")
                ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                : "border-neutral-200 bg-neutral-100 text-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-600"
            )}
          >
            <ImageIcon size={12} />
          </span>
        </div>
      </div>

      {/* Footer Quick Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-rose-500">Excluir?</span>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-rose-700"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(false);
              }}
              className="px-1 text-[10px] text-neutral-400 hover:text-neutral-600"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDelete(true);
            }}
            title="Excluir agente"
            className="flex size-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
          >
            <Trash2 size={13} />
          </button>
        )}

        <div className="flex items-center gap-1.5">
          {/* Detailed View Link */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/weave-ai/agents/${agent.id}`);
            }}
            title="Abrir página completa do agente"
            className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Página</span>
          </button>

          {/* Edit / Configure Modal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(agent);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-neutral-800 active:scale-95 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
          >
            <Settings2 size={13} />
            <span>Configurar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
