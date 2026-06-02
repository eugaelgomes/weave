"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Check,
  Upload,
  FileText,
  Trash2,
  Globe,
  Code2,
  Image as ImageIcon,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAgent, type Agent, type CreateAgentData } from "@/app/_contexts/agent-context";
import { cn } from "@/lib/utils";
import MDEditor from "@uiw/react-md-editor";

const getProviderDetails = (provider: string) => {
  switch (provider) {
    case "gemini":
      return { name: "Google", providerId: "gemini" };
    case "perplexity":
      return { name: "Perplexity", providerId: "perplexity" };
    case "openai":
      return { name: "OpenAI", providerId: "openai" };
    case "claude":
      return { name: "Anthropic", providerId: "claude" };
    default:
      return { name: provider, providerId: provider };
  }
};

const CAPABILITIES = [
  {
    id: "web_search",
    label: "Busca na web",
    icon: Globe,
    hint: "Acesso à internet para informações atuais",
  },
  {
    id: "code_interpreter",
    label: "Interpretador de código",
    icon: Code2,
    hint: "Executar e analisar trechos de código",
  },
  {
    id: "image_generation",
    label: "Geração de imagens",
    icon: ImageIcon,
    hint: "Criar imagens a partir de texto",
  },
];

const INSTRUCTIONS_MAX = 4000;

const inputClass =
  "h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary-500 focus:outline-none focus:ring-1 focus:ring-brand-primary-500/40 dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-100";

const labelClass = "text-[11px] font-medium text-neutral-600 dark:text-neutral-300";

export function AgentForm({
  initialData,
  isEditing = false,
}: {
  initialData?: Agent;
  isEditing?: boolean;
}) {
  const router = useRouter();
  const { createAgent, updateAgent, agentProviders, duplicateAgent, toggleAgentActive } =
    useAgent();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableModels = useMemo(() => {
    return agentProviders.flatMap((p) => {
      const details = getProviderDetails(p.name);
      return (p.models ?? [])
        .filter((m) => !m.deprecated)
        .map((m) => ({
          id: m.version,
          name: `${details.name} — ${m.name}`,
          provider: details.name,
          providerId: p.name,
        }));
    });
  }, [agentProviders]);

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [language, setLanguage] = useState(initialData?.language || "pt-BR");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [modelId, setModelId] = useState(initialData?.model_name || "gemini-3.1-flash");
  const [selectedTools, setSelectedTools] = useState<string[]>(initialData?.tools ?? []);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles] = useState<{ name: string; url: string }[]>(
    initialData?.knowledge_files?.map((f) => ({ name: f.original_name, url: f.url })) || []
  );

  const handleDuplicate = async () => {
    if (!initialData?.id) return;
    setLoading(true);
    try {
      const newAgent = await duplicateAgent(initialData.id);
      toast.success("Agente duplicado com sucesso.");
      router.push(`/weave-ai/agents/${newAgent.id}`);
    } catch (error) {
      console.error("Erro ao duplicar:", error);
      toast.error("Não foi possível duplicar o agente.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!initialData?.id) return;
    setLoading(true);
    try {
      await toggleAgentActive(initialData.id, !isActive);
      setIsActive(!isActive);
      toast.success(isActive ? "Agente desativado." : "Agente ativado.");
      router.refresh();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Falha ao alterar o status do agente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
  };

  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  useEffect(() => {
    if (
      !initialData?.model_name &&
      availableModels.length > 0 &&
      !availableModels.find((m) => m.id === modelId)
    ) {
      setModelId(availableModels[0].id);
    }
  }, [availableModels, initialData, modelId]);

  const handleSave = async () => {
    if (!name.trim() || !description.trim() || !instructions.trim()) {
      toast.error("Preencha nome, descrição e instruções.");
      return;
    }
    if (instructions.length > INSTRUCTIONS_MAX) {
      toast.error(`Instruções ultrapassam ${INSTRUCTIONS_MAX} caracteres.`);
      return;
    }

    setLoading(true);
    try {
      const selectedModel = availableModels.find((m) => m.id === modelId);
      const data: CreateAgentData = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        role: initialData?.role?.trim() || "assistant",
        tone: initialData?.tone?.trim() || "professional",
        language: language.trim() || "pt-BR",
        tags: initialData?.tags ?? [],
        model_name: modelId,
        model_provider: selectedModel?.providerId || "gemini",
        tools: selectedTools,
        knowledge_files: files,
      };

      if (isEditing && initialData?.id) {
        await updateAgent(initialData.id, data);
        toast.success("Agente atualizado.");
        router.refresh();
        return;
      }
      const newAgent = await createAgent(data);
      toast.success("Agente criado.");
      router.push(`/weave-ai/agents/${newAgent.id}`);
    } catch (error) {
      console.error("Error saving agent:", error);
      toast.error("Não foi possível salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && initialData?.id) {
      router.push(`/weave-ai/agents/${initialData.id}`);
      return;
    }
    router.push("/weave-ai/agents");
  };

  return (
    <div className="dark:shadow-surface-dark-sm dark:border-surface-dark-border flex min-h-full flex-col rounded-md border border-neutral-200 bg-neutral-50 shadow-sm dark:bg-[#1d1d1b]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <p className="text-brand-primary-600 dark:text-brand-primary-400 text-[10px] font-bold tracking-wider">
            {isEditing ? "Editar agente" : "Novo agente"}
          </p>
          <p className="truncate text-xs font-medium text-neutral-900 dark:text-neutral-100">
            {name || "Configure abaixo"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isEditing && (
            <>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={loading}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition disabled:opacity-50",
                  isActive
                    ? "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                    : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                )}
                title={isActive ? "Desativar agente" : "Ativar agente"}
              >
                {isActive ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={loading}
                className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="Duplicar agente"
              >
                Duplicar
              </button>
              <div className="mx-1 h-3 w-px bg-neutral-200 dark:bg-neutral-800" />
            </>
          )}
          <button
            type="button"
            onClick={handleCancel}
            className="dark:border-surface-dark-border flex h-7 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <X className="h-3 w-3" />
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="bg-brand-primary-500 hover:bg-brand-primary-400 flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-semibold text-neutral-900 shadow-sm transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            {isEditing ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <section className="dark:border-surface-dark-border border-b border-neutral-100 px-3 py-3">
          <h2 className="mb-2.5 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            Identidade
          </h2>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="space-y-1 sm:col-span-5">
              <label className={labelClass}>Nome do agente *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Ex.: Analista de dados"
              />
            </div>
            <div className="space-y-1 sm:col-span-4">
              <label className={labelClass}>Descrição curta *</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Uma linha sobre o que ele faz"
              />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <label className={labelClass}>Idioma</label>
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={inputClass}
                placeholder="pt-BR, en-US…"
              />
            </div>
          </div>
        </section>

        <section className="dark:border-surface-dark-border border-b border-neutral-100 px-3 py-3">
          <h2 className="mb-2.5 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            Modelo e ferramentas
          </h2>

          <div className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="agent-model-select" className={cn(labelClass, "shrink-0")}>
              Modelo de inferência
            </label>
            <select
              id="agent-model-select"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className={cn(inputClass, "cursor-pointer sm:max-w-[250px]")}
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <p className="mb-1.5 text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Capacidades
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {CAPABILITIES.map((cap) => {
              const active = selectedTools.includes(cap.id);
              return (
                <button
                  key={cap.id}
                  type="button"
                  onClick={() => toggleTool(cap.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-1.5 text-left transition-all",
                    active
                      ? "bg-brand-primary-500/5 ring-brand-primary-500/20 ring-1 ring-inset"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-800">
                      <cap.icon
                        className={cn(
                          "h-3.5 w-3.5",
                          active
                            ? "text-brand-primary-600 dark:text-brand-primary-400"
                            : "text-neutral-500 dark:text-neutral-400"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[11px] font-semibold",
                          active
                            ? "text-brand-primary-700 dark:text-brand-primary-400"
                            : "text-neutral-700 dark:text-neutral-300"
                        )}
                      >
                        {cap.label}
                      </span>
                      <p className="truncate text-[10px] text-neutral-400 dark:text-neutral-500">
                        {cap.hint}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch Componente */}
                  <div
                    className={cn(
                      "flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out",
                      active ? "bg-brand-primary-500" : "bg-neutral-300 dark:bg-neutral-600"
                    )}
                  >
                    <div
                      className={cn(
                        "inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                        active ? "translate-x-3" : "translate-x-0"
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="dark:border-surface-dark-border border-b border-neutral-100 px-3 py-4">
          <div className="mb-3">
            <h2 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
              Instruções do sistema
            </h2>
            <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
              Regras, limites e estilo de resposta. Quanto mais específico, melhor. Use Markdown.
            </p>
          </div>

          <div
            data-color-mode="auto"
            className="dark:border-surface-dark-border overflow-hidden rounded-md border border-neutral-200"
          >
            <MDEditor
              value={instructions}
              onChange={(val) => setInstructions(val || "")}
              height={360}
              preview="live"
              className="w-full text-xs"
              textareaProps={{
                placeholder: "Ex.: Você ajuda a equipe a redigir e-mails claros...",
              }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-end text-[11px] text-neutral-400">
            <span
              className={cn(
                "tabular-nums",
                instructions.length > INSTRUCTIONS_MAX &&
                  "font-semibold text-red-600 dark:text-red-400"
              )}
            >
              {instructions.length}/{INSTRUCTIONS_MAX}
            </span>
          </div>
        </section>

        <section className="px-3 py-4">
          <h2 className="mb-2.5 text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400">
            Base de conhecimento
          </h2>

          <input
            type="file"
            multiple
            className="sr-only"
            ref={fileInputRef}
            onChange={handleFileChange}
            aria-label="Selecionar arquivos"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hover:border-brand-primary-500/50 hover:bg-brand-primary-500/5 dark:hover:border-brand-primary-500/40 dark:border-surface-dark-border-strong flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-neutral-50/50 px-2.5 py-4 text-center text-xs transition lg:py-6 dark:bg-[#1d1d1b]/40"
          >
            <Upload className="text-brand-primary-500 h-4 w-4 shrink-0" />
            <div className="flex min-w-0 flex-col items-start">
              <span className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-200">
                Adicionar arquivos...
              </span>
              <p className="truncate text-[10px] text-neutral-500">PDFs e documentos (até 5MB)</p>
            </div>
          </button>

          {existingFiles.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                Já no agente
              </p>
              <ul className="custom-scrollbar max-h-32 space-y-1 overflow-y-auto">
                {existingFiles.map((file, i) => (
                  <li
                    key={`existing-${i}`}
                    className="dark:border-surface-dark-border flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:bg-[#1d1d1b]"
                  >
                    <FileText className="text-brand-primary-500 h-3.5 w-3.5 shrink-0" />
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate font-medium text-neutral-700 underline-offset-2 hover:underline dark:text-neutral-200"
                    >
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                Pendentes de envio
              </p>
              <ul className="custom-scrollbar max-h-32 space-y-1 overflow-y-auto">
                {files.map((file, i) => (
                  <li
                    key={i}
                    className="group dark:border-surface-dark-border flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:bg-[#1d1d1b]"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="text-brand-primary-500 h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-medium text-neutral-700 dark:text-neutral-200">
                        {file.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, index) => index !== i))}
                      className="rounded p-1 text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      aria-label="Remover arquivo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AgentDetailSkeleton() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="dark:border-surface-dark-border flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <div className="space-y-1.5">
          <div className="h-2.5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-7 w-20 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
          <div className="h-7 w-16 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        </div>
      </div>

      <div className="flex-1 px-3 py-3">
        <div className="mb-2.5 h-2.5 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-2.5 w-14 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800/60" />
              <div className="h-8 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
          ))}
        </div>

        <div className="dark:border-surface-dark-border mt-6 border-t border-neutral-100 pt-3">
          <div className="mb-2.5 h-2.5 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-[120px] w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/60" />
        </div>
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const { getAgent } = useAgent();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getAgent(id)
      .then(setAgent)
      .catch(() => setAgent(null))
      .finally(() => setLoading(false));
  }, [id, getAgent]);

  if (loading) return <AgentDetailSkeleton />;

  if (!agent) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-neutral-400 dark:bg-[#1d1d1b]">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Agente não encontrado
          </p>
          <p className="mt-1 max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
            O link pode estar incorreto ou o acesso foi removido.
          </p>
        </div>
        <Link
          href="/weave-ai/agents"
          className="dark:border-surface-dark-border inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          <ArrowLeft className="h-3 w-3" />
          Visão geral
        </Link>
      </div>
    );
  }

  return <AgentForm initialData={agent} isEditing />;
}
