"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Globe,
  Code2,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Trash2,
  Check,
  Cpu,
  Layers,
  Power,
  FileText,
  AlignLeft,
  Copy,
  Eye,
  Edit3,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Quote,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useAgent, type Agent, type CreateAgentData } from "@/app/_contexts/agent-context";
import { cn } from "@/lib/utils";

interface AgentFormProps {
  onCancel?: () => void;
  agent?: Agent | null;
  onSuccess?: (agent: Agent) => void;
}

const PROVIDERS = [
  { id: "gemini", name: "Google Gemini", badge: "Gemini", color: "#38bdf8" },
  { id: "perplexity", name: "Perplexity", badge: "Perplexity", color: "#f59e0b" },
  { id: "openai", name: "OpenAI", badge: "OpenAI", color: "#10b981" },
  { id: "claude", name: "Anthropic Claude", badge: "Claude", color: "#f97316" },
];

const DEFAULT_MODELS_BY_PROVIDER: Record<string, { id: string; name: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Rápido e Preciso)" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Raciocínio Complexo)" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  ],
  perplexity: [
    { id: "sonar", name: "Sonar (Com busca web em tempo real)" },
    { id: "sonar-pro", name: "Sonar Pro" },
    { id: "sonar-reasoning", name: "Sonar Reasoning" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o (Multimodal Inteligente)" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "o3-mini", name: "o3-mini (Raciocínio Lógico)" },
  ],
  claude: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Excelente em Código)" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
  ],
};

const CAPABILITIES = [
  {
    id: "web_search",
    label: "Busca na Web",
    icon: Globe,
    hint: "Acesso à internet em tempo real",
    color: "text-sky-500",
  },
  {
    id: "code_interpreter",
    label: "Interpretador de Código",
    icon: Code2,
    hint: "Executa cálculos e analisa snippets",
    color: "text-emerald-500",
  },
  {
    id: "image_generation",
    label: "Geração de Imagens",
    icon: ImageIcon,
    hint: "Gera imagens a partir de prompts",
    color: "text-purple-500",
  },
];

const ROLE_SUGGESTIONS = [
  "Assistente Geral",
  "Engenheiro de Software",
  "Pesquisador & Analista",
  "Especialista em Conteúdo",
  "Consultor de Negócios",
  "Arquiteto de Soluções",
];

const PROMPT_TEMPLATES: Record<string, { label: string; role: string; text: string }> = {
  software_engineer: {
    label: "Engenheiro de Software",
    role: "Engenheiro de Software Sênior",
    text: `# Persona
Você é um Engenheiro de Software Sênior especialista em arquitetura moderna, TypeScript, APIs e boas práticas de código limpo.

## Diretrizes de Resposta
1. Sempre priorize soluções tipadas, seguras e de alta performance.
2. Ao sugerir código, forneça explicações concisas sobre as decisões de design.
3. Se houver trade-offs ou alternativas melhores, aponte-os com clareza.

## Formato
- Use blocos de código com a linguagem especificada.
- Destaque alertas ou pontos de atenção com notas claras.`,
  },
  researcher: {
    label: "Pesquisador & Analista",
    role: "Pesquisador & Analista de Dados",
    text: `# Persona
Você é um Pesquisador e Analista especializado em sintetizar informações complexas de forma clara, objetiva e estruturada.

## Diretrizes
1. Use informações baseadas em fatos e cite fontes sempre que possível.
2. Divida relatórios longos em tópicos executivos (Resumo, Pontos Principais, Conclusão).
3. Seja neutro, preciso e metódico.`,
  },
  copywriter: {
    label: "Redator Criativo",
    role: "Redator & Estrategista de Conteúdo",
    text: `# Persona
Você é um Redator Criativo e Estrategista de Comunicação, especialista em copy envolvente, clara e persuasiva.

## Diretrizes
1. Mantenha um tom profissional, amigável e direto ao ponto.
2. Evite jargões desnecessários ou clichês vazios.
3. Ofereça opções de headlines e variações de tom sempre que apropriado.`,
  },
};

export default function AgentForm({ onCancel, agent, onSuccess }: AgentFormProps) {
  const [mounted, setMounted] = useState(false);
  const { createAgent, updateAgent, deleteAgent, duplicateAgent, agentProviders, loadProviders } =
    useAgent();

  const isEditing = Boolean(agent?.id);

  // Agent Form State
  const [name, setName] = useState(agent?.name || "");
  const [role, setRole] = useState(agent?.role || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [instructions, setInstructions] = useState(agent?.instructions || "");
  const [provider, setProvider] = useState(agent?.model_provider || "gemini");
  const [modelName, setModelName] = useState(agent?.model_name || "gemini-2.5-flash");
  const [tools, setTools] = useState<string[]>(agent?.tools || ["web_search"]);
  const [isActive, setIsActive] = useState(agent?.is_active ?? true);

  // View state
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    loadProviders();
  }, [loadProviders]);

  // Sync state when agent prop changes or modal opens
  useEffect(() => {
    if (agent) {
      setName(agent.name || "");
      setRole(agent.role || "");
      setDescription(agent.description || "");
      setInstructions(agent.instructions || "");
      setProvider(agent.model_provider || "gemini");
      setModelName(agent.model_name || "gemini-2.5-flash");
      setTools(agent.tools || ["web_search"]);
      setIsActive(agent.is_active ?? true);
    } else {
      setName("");
      setRole("Assistente Geral");
      setDescription("");
      setInstructions("");
      setProvider("gemini");
      setModelName("gemini-2.5-flash");
      setTools(["web_search"]);
      setIsActive(true);
    }
    setActiveTab("write");
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

  // Compute available models for the selected provider
  const availableModels = useMemo(() => {
    const serverProvider = agentProviders.find(
      (p) => p.name.toLowerCase() === provider.toLowerCase()
    );

    if (
      serverProvider &&
      Array.isArray(serverProvider.models) &&
      serverProvider.models.length > 0
    ) {
      return serverProvider.models
        .filter((m) => !m.deprecated)
        .map((m) => ({
          id: m.version || m.id,
          name: m.name || m.version,
        }));
    }

    return DEFAULT_MODELS_BY_PROVIDER[provider] || DEFAULT_MODELS_BY_PROVIDER.gemini;
  }, [agentProviders, provider]);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const modelsForNew = DEFAULT_MODELS_BY_PROVIDER[newProvider] || [];
    if (modelsForNew.length > 0) {
      setModelName(modelsForNew[0].id);
    }
  };

  const toggleTool = (toolId: string) => {
    setTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  // Helper to insert markdown formatting into textarea
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const previousText = textarea.value;
    const selectedText = previousText.substring(start, end);

    const replacement = `${prefix}${selectedText || "texto"}${suffix}`;
    const newContent = previousText.substring(0, start) + replacement + previousText.substring(end);

    setInstructions(newContent);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 5);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const applyTemplate = (templateKey: string) => {
    const tpl = PROMPT_TEMPLATES[templateKey];
    if (!tpl) return;

    if (instructions.trim() && !window.confirm("Substituir as instruções atuais pelo template?")) {
      return;
    }

    setInstructions(tpl.text);
    if (!role || role === "Assistente Geral") {
      setRole(tpl.role);
    }
    if (!name) {
      setName(tpl.label);
    }
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

    setIsSubmitting(true);
    try {
      const payload: CreateAgentData = {
        name: name.trim(),
        role: role.trim() || "Assistente",
        description: description.trim() || `Agente especializado em ${role.trim() || name.trim()}`,
        instructions: instructions.trim(),
        model_provider: provider,
        model_name: modelName,
        tools,
        is_active: isActive,
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
          <div className="space-y-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-4 dark:border-neutral-800/80 dark:bg-neutral-900/40">
            <div className="space-y-1.5 border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
              <label
                htmlFor="agent-name"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Nome do agente
              </label>
              <input
                id="agent-name"
                type="text"
                autoFocus={!isEditing}
                placeholder="Nome do agente"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-none bg-transparent p-0 text-lg font-semibold tracking-tight text-neutral-900 placeholder:text-neutral-300 focus:ring-0 focus:outline-none dark:text-neutral-50 dark:placeholder:text-neutral-700"
              />
            </div>

            {/* Propriedade: Papel / Função */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <Layers size={13} className="text-neutral-400" />
                <span>Função / Papel</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="ex: Engenheiro de Software, Assistente Jurídico..."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="min-w-[200px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs font-medium text-neutral-800 transition hover:border-neutral-200 focus:border-neutral-300 focus:bg-white focus:outline-none dark:text-neutral-200 dark:hover:border-neutral-700 dark:focus:border-neutral-600 dark:focus:bg-neutral-800"
                />
              </div>
            </div>

            {/* Quick Role Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {ROLE_SUGGESTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-medium transition",
                    role === r
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-neutral-200/70 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Propriedade: Provedor & Modelo de IA */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <Cpu size={13} className="text-neutral-400" />
                <span>Modelo de IA</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {/* Provider Selector */}
                <select
                  value={provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 transition hover:border-neutral-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Model Selector */}
                <select
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="min-w-[180px] cursor-pointer rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 transition hover:border-neutral-300 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Propriedade: Ferramentas / Capacidades */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <Sparkles size={13} className="text-neutral-400" />
                <span>Ferramentas</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {CAPABILITIES.map((cap) => {
                  const Icon = cap.icon;
                  const isEnabled = tools.includes(cap.id);
                  return (
                    <button
                      key={cap.id}
                      type="button"
                      onClick={() => toggleTool(cap.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                        isEnabled
                          ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-600"
                      )}
                    >
                      <Icon size={12} />
                      <span>{cap.label}</span>
                      {isEnabled && <Check size={11} className="stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Propriedade: Status Ativo / Inativo */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <Power size={13} className="text-neutral-400" />
                <span>Status</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive((prev) => !prev)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                    isActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      isActive ? "bg-emerald-500" : "bg-neutral-400"
                    )}
                  />
                  <span>{isActive ? "Ativo no quadro" : "Pausado / Inativo"}</span>
                </button>
              </div>
            </div>

            {/* Propriedade: Descrição Curta */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <AlignLeft size={13} className="text-neutral-400" />
                <span>Descrição</span>
              </div>
              <input
                type="text"
                placeholder="Resumo em uma frase do objetivo principal..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs text-neutral-800 transition hover:border-neutral-200 focus:border-neutral-300 focus:bg-white focus:outline-none dark:text-neutral-200 dark:hover:border-neutral-700 dark:focus:border-neutral-600 dark:focus:bg-neutral-800"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/80 pt-3 dark:border-neutral-800">
              <div className="flex items-center gap-1">
                {isEditing && (
                  <>
                    {confirmDelete ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 dark:border-rose-900/40 dark:bg-rose-950/30">
                        <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          Excluir?
                        </span>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={handleDelete}
                          className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-rose-700"
                        >
                          {isDeleting ? <Loader2 size={11} className="animate-spin" /> : "Sim"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-800"
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-brand-primary-500" />
                <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
                  Instruções de Sistema (Prompt)
                </h3>
              </div>

              {/* Templates Quick Pick */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-neutral-400">Modelos:</span>
                {Object.entries(PROMPT_TEMPLATES).map(([key, tpl]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyTemplate(key)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-500"
                  >
                    <Wand2 size={10} />
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Formatting Toolbar & Mode Tabs */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/80 px-2.5 py-1.5 dark:border-neutral-800 dark:bg-neutral-900/60">
              {/* Formatting Tools */}
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  title="Negrito"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  title="Itálico"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("# ")}
                  title="Título H1"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Heading1 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("## ")}
                  title="Título H2"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Heading2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("- ")}
                  title="Lista com marcadores"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("1. ")}
                  title="Lista numerada"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <ListOrdered size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("```\n", "\n```")}
                  title="Bloco de código"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Code size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("> ")}
                  title="Citação"
                  className="flex size-7 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200/70 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Quote size={13} />
                </button>
              </div>

              {/* Edit / Preview Tabs */}
              <div className="flex items-center gap-1 rounded-lg bg-neutral-200/70 p-0.5 dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition",
                    activeTab === "write"
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  <Edit3 size={11} />
                  <span>Escrever</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition",
                    activeTab === "preview"
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  <Eye size={11} />
                  <span>Visualizar</span>
                </button>
              </div>
            </div>

            {/* Editor Writing Area */}
            {activeTab === "write" ? (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={12}
                  maxLength={4000}
                  placeholder="Escreva como em uma nota: defina quem é o agente, suas diretrizes, regras de formatação, tom de resposta e restrições...&#10;&#10;Exemplo:&#10;# Persona&#10;Você é um assistente sênior...&#10;&#10;## Regras&#10;1. Seja claro e conciso.&#10;2. Use código sempre que apropriado."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full resize-y rounded-xl border border-neutral-200 bg-white p-4 font-mono text-xs leading-relaxed text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-100 dark:placeholder:text-neutral-700 dark:focus:border-white dark:focus:ring-white"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Dica: Use markdown para estruturar personas e regras.</span>
                  <span className={cn(instructions.length > 3800 && "font-medium text-rose-500")}>
                    {instructions.length} / 4000
                  </span>
                </div>
              </div>
            ) : (
              <div className="min-h-[250px] rounded-xl border border-neutral-200 bg-neutral-50/50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
                {instructions.trim() ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none font-sans text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                    {instructions}
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center text-xs text-neutral-400">
                    Nenhuma instrução escrita para visualizar.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
