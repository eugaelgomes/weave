"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  Trash2,
  Check,
  Cpu,
  Layers,
  Power,
  FileText,
  Copy,
  Wrench,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAgent, type Agent, type CreateAgentData } from "@/app/_contexts/agent-context";
import {
  fetchAgentCustomTools,
  fetchAgentLlmConfigs,
  type AgentCustomTool,
  type AgentLlmConfig,
} from "@/app/_services/ai-agent-service/agent-service";
import { AgentPromptEditor } from "@/app/(protected)/_components/agent/agent-prompt-editor";
import {
  type PromptDocument,
  isPromptDocument,
  markdownToPromptDocument,
  promptDocumentToMarkdown,
} from "@/app/(protected)/_components/agent/agent-prompt-document";
import { cn } from "@/lib/utils";

interface AgentFormProps {
  onCancel?: () => void;
  agent?: Agent | null;
  onSuccess?: (agent: Agent) => void;
}

function AgentConfigSection({
  children,
  defaultOpen = false,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1.5 text-xs font-medium text-neutral-600 marker:content-none hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
        <ChevronRight
          size={13}
          className="text-neutral-400 transition-transform group-open:rotate-90"
        />
        <Icon size={13} className="text-neutral-400" />
        <span>{title}</span>
      </summary>
      <div className="pt-1 pb-3 pl-7">{children}</div>
    </details>
  );
}

export default function AgentForm({ onCancel, agent, onSuccess }: AgentFormProps) {
  const [mounted, setMounted] = useState(false);
  const { createAgent, updateAgent, deleteAgent, duplicateAgent } = useAgent();

  const isEditing = Boolean(agent?.id);

  // Agent Form State
  const [name, setName] = useState(agent?.name || "");
  const [role, setRole] = useState(agent?.role || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [promptDocument, setPromptDocument] = useState<PromptDocument>(() =>
    isPromptDocument(agent?.instructions_document)
      ? agent.instructions_document
      : markdownToPromptDocument(agent?.instructions || "")
  );
  const [promptEditorVersion, setPromptEditorVersion] = useState(0);
  const [provider, setProvider] = useState(agent?.model_provider || "");
  const [modelName, setModelName] = useState(agent?.model_name || "");
  const [llmConfigs, setLlmConfigs] = useState<AgentLlmConfig[]>([]);
  const [loadingLlmConfigs, setLoadingLlmConfigs] = useState(true);
  const [tools, setTools] = useState<string[]>(agent?.tools || []);
  const [customTools, setCustomTools] = useState<AgentCustomTool[]>([]);
  const [loadingCustomTools, setLoadingCustomTools] = useState(true);
  const [isActive, setIsActive] = useState(agent?.is_active ?? true);

  // View state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    void fetchAgentLlmConfigs()
      .then((configs) => {
        if (!cancelled) setLlmConfigs(configs);
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar os modelos configurados.");
      })
      .finally(() => {
        if (!cancelled) setLoadingLlmConfigs(false);
      });

    void fetchAgentCustomTools()
      .then((availableTools) => {
        if (!cancelled) setCustomTools(availableTools);
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar as ferramentas configuradas.");
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomTools(false);
      });

    return () => {
      cancelled = true;
    };
  }, [agent]);

  // Sync state when agent prop changes or modal opens
  useEffect(() => {
    if (agent) {
      setName(agent.name || "");
      setRole(agent.role || "");
      setDescription(agent.description || "");
      setPromptDocument(
        isPromptDocument(agent.instructions_document)
          ? agent.instructions_document
          : markdownToPromptDocument(agent.instructions || "")
      );
      setProvider(agent.model_provider || "");
      setModelName(agent.model_name || "");
      setTools(agent.tools || []);
      setIsActive(agent.is_active ?? true);
    } else {
      setName("");
      setRole("");
      setDescription("");
      setPromptDocument(markdownToPromptDocument(""));
      setProvider("");
      setModelName("");
      setTools([]);
      setIsActive(true);
    }
    setPromptEditorVersion((version) => version + 1);
    setConfirmDelete(false);
  }, [agent]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCancel) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const instructions = useMemo(() => promptDocumentToMarkdown(promptDocument), [promptDocument]);

  const selectedLlmConfig = useMemo(
    () => llmConfigs.find((config) => config.provider === provider && config.model === modelName),
    [llmConfigs, modelName, provider]
  );

  const handleModelChange = (configId: string) => {
    const config = llmConfigs.find((item) => item.id === configId);
    if (!config) return;
    setProvider(config.provider);
    setModelName(config.model);
  };

  const toggleTool = (toolId: string) => {
    setTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      toast.error("Informe o nome do agente.");
      return;
    }

    if (!instructions.trim()) {
      toast.error("Escreva as instruções do agente.");
      return;
    }

    if (!provider || !modelName) {
      toast.error("Selecione um modelo configurado.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateAgentData = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        instructions_document: promptDocument,
        model_provider: provider,
        model_name: modelName,
        tools,
        is_active: isActive,
        ...(role.trim() ? { role: role.trim() } : {}),
      };

      let resultAgent: Agent;
      if (isEditing && agent?.id) {
        resultAgent = await updateAgent(agent.id, payload);
        toast.success(`Agente "${resultAgent.name}" salvo com sucesso!`);
      } else {
        resultAgent = await createAgent(payload);
        toast.success(`Agente "${resultAgent.name}" criado no quadro!`);
      }

      onSuccess?.(resultAgent);
      if (onCancel) onCancel();
    } catch (err: unknown) {
      console.error("Erro ao salvar agente:", err);
      const message = err instanceof Error ? err.message : "Não foi possível salvar o agente.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!agent?.id) return;
    setIsDeleting(true);
    try {
      await deleteAgent(agent.id);
      toast.success(`Agente "${agent.name}" excluído.`);
      if (onCancel) onCancel();
    } catch (err: unknown) {
      console.error("Erro ao excluir agente:", err);
      const message = err instanceof Error ? err.message : "Falha ao excluir o agente.";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    if (!agent?.id) return;
    setIsSubmitting(true);
    try {
      const cloned = await duplicateAgent(agent.id);
      toast.success(`Agente duplicado como "${cloned.name}"!`);
      if (onCancel) onCancel();
    } catch (err: unknown) {
      console.error("Erro ao duplicar agente:", err);
      const message = err instanceof Error ? err.message : "Falha ao duplicar.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-white dark:bg-[#1d1d1b]">
      {/* ========================================================================= */}
      {/* DOCUMENT CANVAS BODY */}
      {/* ========================================================================= */}
      <div className="no-scrollbar flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)] xl:items-start">
          {/* ===================================================================== */}
          {/* NOTION / WEAVE TASK PROPERTIES (Metadados do Agente)                  */}
          {/* ===================================================================== */}
          <div className="space-y-3">
            <AgentConfigSection defaultOpen icon={Layers} title="Identidade">
              <div className="space-y-3">
                <label
                  htmlFor="agent-name"
                  className="block text-xs text-neutral-500 dark:text-neutral-400"
                >
                  Nome do agente
                  <input
                    id="agent-name"
                    type="text"
                    autoFocus={!isEditing}
                    placeholder="Nome do agente"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1 text-xs font-medium text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-500 dark:border-neutral-700 dark:text-neutral-50 dark:placeholder:text-neutral-700"
                  />
                </label>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Função / papel
                  <input
                    type="text"
                    placeholder="Ex.: Engenheiro de software"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1 text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200"
                  />
                </label>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                  Descrição
                  <input
                    type="text"
                    placeholder="Resumo em uma frase do objetivo principal"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 w-full border-b border-neutral-200 bg-transparent py-1 text-xs text-neutral-800 outline-none focus:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200"
                  />
                </label>
              </div>
            </AgentConfigSection>

            <AgentConfigSection defaultOpen icon={Cpu} title="Modelo">
              <select
                value={selectedLlmConfig?.id ?? ""}
                disabled={loadingLlmConfigs || llmConfigs.length === 0}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full cursor-pointer border-b border-neutral-200 bg-transparent py-1 text-xs text-neutral-800 outline-none focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200"
              >
                <option value="" disabled>
                  {loadingLlmConfigs
                    ? "Carregando modelos..."
                    : llmConfigs.length === 0
                      ? "Nenhum modelo configurado"
                      : "Selecione um modelo"}
                </option>
                {llmConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.title} — {config.provider} / {config.model}
                  </option>
                ))}
              </select>
            </AgentConfigSection>

            <AgentConfigSection icon={Wrench} title="Conectores">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-neutral-400">Ferramentas do agente</p>
                <Link
                  href="/weave-ai/tools"
                  className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                >
                  Gerenciar
                </Link>
              </div>
              {loadingCustomTools ? (
                <div className="flex items-center gap-1.5 py-1 text-xs text-neutral-400">
                  <Loader2 size={12} className="animate-spin" /> Carregando conectores...
                </div>
              ) : customTools.length === 0 ? (
                <p className="text-xs text-neutral-400">Nenhum conector configurado.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {customTools.map((tool) => {
                    const isEnabled = tools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        title={tool.description || tool.webhook_url}
                        onClick={() => toggleTool(tool.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-1 py-0.5 text-xs transition",
                          isEnabled
                            ? "text-neutral-900 dark:text-neutral-50"
                            : "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            isEnabled ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                          )}
                        />
                        <span>{tool.name}</span>
                        {isEnabled && <Check size={11} className="stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {tools
                .filter((toolId) => !customTools.some((tool) => tool.id === toolId))
                .map((toolId) => (
                  <button
                    key={toolId}
                    type="button"
                    onClick={() => toggleTool(toolId)}
                    className="mt-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
                  >
                    Remover conector não encontrado: {toolId}
                  </button>
                ))}
            </AgentConfigSection>

            <AgentConfigSection icon={Power} title="Disponibilidade">
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs transition",
                  isActive
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-neutral-500 dark:text-neutral-400"
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isActive ? "bg-emerald-500" : "bg-neutral-400"
                  )}
                />
                <span>{isActive ? "Ativo no quadro" : "Pausado / Inativo"}</span>
              </button>
            </AgentConfigSection>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-1">
                {isEditing && (
                  <>
                    {confirmDelete ? (
                      <div className="flex items-center gap-1.5 bg-rose-50 px-2 py-1 dark:bg-rose-950/30">
                        <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                          Excluir?
                        </span>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleDelete}
                          className="rounded bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          {isDeleting ? <Loader2 size={11} className="animate-spin" /> : "Sim"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="text-xs text-neutral-500 hover:text-neutral-800"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        title="Excluir agente"
                        className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-rose-600 dark:hover:bg-neutral-800 dark:hover:text-rose-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDuplicate}
                      title="Duplicar agente"
                      className="flex size-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                    >
                      <Copy size={15} />
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs font-medium text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSubmit()}
                  className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800 active:scale-95 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>{isEditing ? "Salvar" : "Criar agente"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* INSTRUCTIONS / PROMPT DOCUMENT EDITOR (O Corpo da "Nota")              */}
          {/* ===================================================================== */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-brand-primary-500" />
                <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                  Instruções de Sistema (Prompt)
                </h3>
              </div>
            </div>

            <AgentPromptEditor
              document={promptDocument}
              version={promptEditorVersion}
              onChange={setPromptDocument}
            />
            <p className="text-xs text-neutral-400">
              O agente recebe este documento como Markdown estruturado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
