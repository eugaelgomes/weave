"use client";

import { useState, useRef, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Settings2,
  Sparkles,
  Upload,
  FileText,
  Trash2,
  BrainCircuit,
  Globe,
  Code2,
  Image as ImageIcon,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAgent } from "@/app/_contexts/agent-context";
import { Agent, CreateAgentData } from "@/app/_services/ai-agent-service/agent-service";
import { cn } from "@/lib/utils";

const AI_MODELS = [
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", providerId: "gemini" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", providerId: "gemini" },
  {
    id: "sonar-pro",
    name: "Perplexity Sonar Pro",
    provider: "Perplexity",
    providerId: "perplexity",
  },
];

const CAPABILITIES = [
  {
    id: "web_search",
    label: "Busca na web",
    icon: Globe,
    description: "Acesso à internet para informações atuais.",
  },
  {
    id: "code_interpreter",
    label: "Interpretador de código",
    icon: Code2,
    description: "Executar e analisar código (ex.: Python).",
  },
  {
    id: "image_generation",
    label: "Geração de imagens",
    icon: ImageIcon,
    description: "Criar imagens a partir de texto.",
  },
];

const INSTRUCTIONS_MAX = 4000;

interface AgentFormProps {
  initialData?: Agent;
  isEditing?: boolean;
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary-500/12 text-brand-primary-600 dark:text-brand-primary-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{description}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AgentForm({ initialData, isEditing = false }: AgentFormProps) {
  const router = useRouter();
  const { createAgent, updateAgent } = useAgent();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [role, setRole] = useState(initialData?.role || "assistant");
  const [tone, setTone] = useState(initialData?.tone || "professional");
  const [language, setLanguage] = useState(initialData?.language || "pt-BR");
  const [tags, setTags] = useState(initialData?.tags?.join(", ") || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [modelId, setModelId] = useState(initialData?.model_name || "gemini-1.5-flash");
  const initialTools: string[] = initialData?.tools ?? [];
  const [selectedTools, setSelectedTools] = useState<string[]>(initialTools);

  const [files, setFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<{ name: string; url: string }[]>(
    initialData?.knowledge_files?.map((f) => ({ name: f.original_name, url: f.url })) || []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = "";
  };

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
      const selectedModel = AI_MODELS.find((m) => m.id === modelId);
      const data: CreateAgentData = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        role: role.trim() || "assistant",
        tone: tone.trim() || "professional",
        language: language.trim() || "pt-BR",
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
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
      router.push(`/app/weave-ai/agent/${newAgent.id}`);
    } catch (error) {
      console.error("Error saving agent:", error);
      toast.error("Não foi possível salvar o agente. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isEditing && initialData?.id) {
      router.push(`/app/weave-ai/agent/${initialData.id}`);
      return;
    }
    router.push("/app/weave-ai/agent");
  };

  const inputClass =
    "h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <div className="flex min-h-full flex-col bg-neutral-50/60 dark:bg-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200/90 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary-600 dark:text-brand-primary-400">
              {isEditing ? "Editar agente" : "Novo agente"}
            </p>
            <h1 className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {isEditing ? name || "Agente" : "Configurar assistente"}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              Identidade, comportamento, modelo e arquivos de apoio.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary-500 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-brand-primary-400 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEditing ? "Salvar alterações" : "Criar agente"}
            </button>
          </div>
        </div>
      </header>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <SectionTitle
              icon={Bot}
              title="Identidade"
              description="Como o agente se apresenta e em que contexto deve ajudar."
            />
            <div className="p-4">
              <div className="mb-4 flex gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 dark:border-neutral-600 dark:bg-neutral-900"
                  title="Avatar opcional — em breve"
                >
                  <Sparkles className="h-5 w-5 text-brand-primary-500" />
                  <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide">Logo</span>
                </div>
                <p className="self-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                  O nome e a descrição aparecem na lista de agentes. Use a função (papel) para lembrar a si e à equipe para que serve.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Nome do agente *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Ex.: Analista de dados"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Descrição curta *</label>
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={inputClass}
                    placeholder="Uma linha sobre o que ele faz"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Papel / função</label>
                  <input
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className={inputClass}
                    placeholder="Ex.: Assistente de vendas"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Tom</label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className={inputClass}
                    placeholder="Ex.: Profissional, direto"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Idioma</label>
                  <input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className={inputClass}
                    placeholder="pt-BR, en-US…"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Tags</label>
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className={inputClass}
                    placeholder="Separadas por vírgula: vendas, crm, b2b"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <SectionTitle
              icon={Settings2}
              title="Instruções do sistema"
              description="Regras, limites e estilo de resposta. Quanto mais específico, melhor o resultado."
            />
            <div className="p-4">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[220px] w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                placeholder="Ex.: Você ajuda a equipe a redigir e-mails claros. Sempre confirme o tom desejado antes de sugerir o texto final. Não invente dados de clientes."
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <span>Markdown é aceito onde o canal de uso permitir.</span>
                <span
                  className={cn(
                    "tabular-nums",
                    instructions.length > INSTRUCTIONS_MAX ? "font-semibold text-red-600 dark:text-red-400" : ""
                  )}
                >
                  {instructions.length} / {INSTRUCTIONS_MAX}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <SectionTitle icon={BrainCircuit} title="Modelo e ferramentas" description="Motor de inferência e capacidades opcionais." />
              <div className="space-y-4 p-4">
                <div className="space-y-1.5">
                  <label htmlFor="agent-model-select" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Modelo
                  </label>
                  <select
                    id="agent-model-select"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className={cn(inputClass, "cursor-pointer")}
                  >
                    {AI_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} — {model.provider}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Ferramentas</label>
                  <div className="space-y-2">
                    {CAPABILITIES.map((cap) => (
                      <label
                        key={cap.id}
                        className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 transition hover:border-brand-primary-500/40 hover:bg-white dark:border-neutral-800 dark:bg-neutral-900/60 dark:hover:border-brand-primary-500/35 dark:hover:bg-neutral-900"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(cap.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTools((prev) => [...prev, cap.id]);
                            } else {
                              setSelectedTools((prev) => prev.filter((id) => id !== cap.id));
                            }
                          }}
                          className="mt-1 h-4 w-4 rounded border-neutral-300 text-brand-primary-500 focus:ring-brand-primary-500 dark:border-neutral-600"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <cap.icon className="h-4 w-4 text-brand-primary-600 dark:text-brand-primary-400" />
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{cap.label}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{cap.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <SectionTitle
                icon={FileText}
                title="Base de conhecimento"
                description="PDFs e documentos usados como contexto (até 5 arquivos, 5 MB cada no envio)."
              />
              <div className="space-y-3 p-4">
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  aria-label="Selecionar arquivos para a base de conhecimento"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 px-4 py-8 text-sm text-neutral-600 transition hover:border-brand-primary-500/50 hover:bg-brand-primary-500/5 dark:border-neutral-600 dark:bg-neutral-900/40 dark:text-neutral-300"
                >
                  <Upload className="h-6 w-6 text-brand-primary-500" />
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">Arraste ou clique para adicionar arquivos</span>
                  <span className="text-xs text-neutral-500">Novos arquivos são enviados ao salvar</span>
                </button>

                {existingFiles.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Já no agente</p>
                    <ul className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto">
                      {existingFiles.map((file, i) => (
                        <li
                          key={`existing-${i}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-brand-primary-500" />
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate font-medium text-neutral-700 underline-offset-2 hover:underline dark:text-neutral-200"
                            >
                              {file.name}
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {files.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">Novos (pendentes de envio)</p>
                    <ul className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto">
                      {files.map((file, i) => (
                        <li
                          key={i}
                          className="group flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-brand-primary-500" />
                            <span className="truncate font-medium text-neutral-700 dark:text-neutral-200">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFiles((prev) => prev.filter((_, index) => index !== i))}
                            className="rounded-md p-1.5 text-neutral-400 opacity-70 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            aria-label="Remover arquivo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
