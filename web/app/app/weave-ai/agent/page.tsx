"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAgent } from "@/app/_contexts/agent-context";
import { Agent } from "@/app/_services/ai-agent-service/agent-service";
import {
  BrainCircuit,
  Clock3,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const providerPalette: Record<string, { label: string; accent: string; text: string }> = {
  gemini: {
    label: "Gemini",
    accent:
      "from-sky-200/40 via-slate-50 to-white dark:from-slate-900/60 dark:via-neutral-950 dark:to-neutral-950",
    text: "text-sky-600 dark:text-sky-300",
  },
  perplexity: {
    label: "Perplexity",
    accent:
      "from-amber-200/40 via-orange-50 to-white dark:from-amber-900/50 dark:via-neutral-950 dark:to-neutral-950",
    text: "text-amber-600 dark:text-amber-300",
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-sm border border-neutral-200 bg-white px-3 py-2 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-1 text-[9px] font-semibold tracking-[0.35em] text-neutral-500 uppercase">
        <Icon className="h-3 w-3 text-brand-primary-700" />
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        {value}
      </div>
      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{description}</p>
    </div>
  );
}

function ProviderFilter({
  value,
  selected,
  onSelect,
}: {
  value: string;
  selected: boolean;
  onSelect: (value: string) => void;
}) {
  const palette = providerPalette[value];
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-medium transition",
        selected
          ? "border-yellow-500 bg-brand-primary-700/90 text-neutral-900"
          : "border-neutral-200 text-neutral-500 hover:text-neutral-900"
      )}
    >
      <span>{palette?.label ?? "All"}</span>
    </button>
  );
}

function AgentCard({ agent, onClick }: { agent: Agent; onClick: () => void }) {
  const palette = providerPalette[agent.model_provider] ?? providerPalette.gemini;
  const tagLine = agent.tags?.slice(0, 3).join(" · ") || "No tags";
  const updatedAt = agent.updated_at ? new Date(agent.updated_at).toLocaleDateString() : "recently";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-full flex-col rounded-sm border border-neutral-200 bg-white p-3 text-left text-neutral-700 transition hover:border-yellow-500",
        "dark:border-neutral-800 dark:bg-neutral-950"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[9px] font-semibold tracking-[0.3em] text-yellow-600 uppercase">
            {palette.label}
          </span>
          <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            {agent.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[12px] text-neutral-500 dark:text-neutral-400">
            {agent.description || "Sem descrição"}
          </p>
        </div>
        <Sparkles className="h-4 w-4 text-brand-primary-700" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-neutral-500">
        <div className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          {agent.role || "Assistant"}
        </div>
        <div className="flex items-center gap-1">
          <BrainCircuit className="h-3 w-3" />
          {agent.tools?.length ? `${agent.tools.length} tools` : "No tools"}
        </div>
        <div className="flex items-center gap-1">
          <Clock3 className="h-3 w-3" />
          {updatedAt}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] font-medium">
        <span className="truncate text-neutral-400">{tagLine}</span>
        <span className="text-yellow-600 transition group-hover:translate-x-0.5">Editar →</span>
      </div>
    </button>
  );
}

export default function AgentsOverviewPage() {
  const router = useRouter();
  const { agents, loading, loadAgents } = useAgent();
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "gemini" | "perplexity">("all");

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesQuery =
        !query.trim() ||
        agent.name.toLowerCase().includes(query.toLowerCase()) ||
        (agent.description || "").toLowerCase().includes(query.toLowerCase());

      const matchesProvider = providerFilter === "all" || agent.model_provider === providerFilter;

      return matchesQuery && matchesProvider;
    });
  }, [agents, providerFilter, query]);

  const stats = useMemo(() => {
    const total = agents.length;
    const knowledgeEnabled = agents.filter((agent) => agent.knowledge_files?.length).length;
    const gemini = agents.filter((agent) => agent.model_provider === "gemini").length;
    const perplexity = agents.filter((agent) => agent.model_provider === "perplexity").length;
    return { total, knowledgeEnabled, gemini, perplexity };
  }, [agents]);

  return (
    <div className="flex h-full flex-col gap-3 bg-white p-3 text-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-neutral-200 bg-neutral-50 px-3 py-2 text-[10px] dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <p className="text-[9px] font-semibold tracking-[0.4em] text-neutral-400 uppercase">
            Agent Studio
          </p>
          <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Orquestra seus fluxos de IA
          </h1>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => loadAgents()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-sm border border-neutral-200 px-2 py-1 text-[10px] font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-700"
          >
            <RefreshCcw className={cn("h-3 w-3", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => router.push("/app/weave-ai/agent/new")}
            className="inline-flex items-center gap-1 rounded-sm border border-yellow-500 bg-brand-primary-700/90 px-2 py-1 text-[10px] font-semibold text-neutral-900"
          >
            <Plus className="h-3 w-3" />
            New Agent
          </button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Active Agents"
          value={String(stats.total)}
          description="Disponíveis para sua equipe"
        />
        <StatCard
          icon={ShieldCheck}
          label="Knowledge Ready"
          value={String(stats.knowledgeEnabled)}
          description="Com base de conhecimento configurada"
        />
        <StatCard
          icon={BrainCircuit}
          label="Gemini"
          value={String(stats.gemini)}
          description="Modelos Google Gemini"
        />
        <StatCard
          icon={Filter}
          label="Perplexity"
          value={String(stats.perplexity)}
          description="Agentes conectados ao Sonar"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-sm border border-neutral-200 bg-white px-2 py-2 text-[10px] dark:border-neutral-800 dark:bg-neutral-950">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome ou descrição"
            className="h-8 w-full rounded-sm border border-neutral-200 bg-white pr-2 pl-7 text-[11px] text-neutral-700 focus:border-yellow-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-neutral-500">
          Filter:
          <ProviderFilter
            value="all"
            selected={providerFilter === "all"}
            onSelect={() => setProviderFilter("all")}
          />
          <ProviderFilter
            value="gemini"
            selected={providerFilter === "gemini"}
            onSelect={() => setProviderFilter("gemini")}
          />
          <ProviderFilter
            value="perplexity"
            selected={providerFilter === "perplexity"}
            onSelect={() => setProviderFilter("perplexity")}
          />
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-sm border border-dashed border-neutral-300 bg-white p-6 text-center text-[11px] dark:border-neutral-800 dark:bg-neutral-950">
          <Sparkles className="mb-2 h-6 w-6 text-brand-primary-700" />
          <p className="text-neutral-500 dark:text-neutral-400">
            Nenhum agente encontrado. Ajuste os filtros ou crie um novo assistente personalizado.
          </p>
          <Link
            href="/app/weave-ai/agent/new"
            className="mt-3 inline-flex items-center gap-1 rounded-sm border border-yellow-500 bg-brand-primary-700/95 px-3 py-1 text-[10px] font-semibold text-neutral-900"
          >
            <Plus className="h-3 w-3" /> Criar agente
          </Link>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => router.push(`/app/weave-ai/agent/${agent.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
