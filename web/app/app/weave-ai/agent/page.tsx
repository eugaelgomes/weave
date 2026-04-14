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
  ArrowRight,
} from "lucide-react";

const providerMeta: Record<string, { label: string; chip: string }> = {
  gemini: {
    label: "Gemini",
    chip: "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-300 dark:ring-sky-500/30",
  },
  perplexity: {
    label: "Perplexity",
    chip: "bg-amber-500/10 text-amber-800 ring-amber-500/20 dark:text-amber-200 dark:ring-amber-500/25",
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
    <div className="rounded-xl border border-neutral-200/90 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary-500/12 text-brand-primary-600 dark:text-brand-primary-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ProviderChip({
  id,
  label,
  selected,
  onSelect,
}: {
  id: "all" | "gemini" | "perplexity";
  label: string;
  selected: boolean;
  onSelect: (id: "all" | "gemini" | "perplexity") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition",
        selected
          ? "bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      )}
    >
      {label}
    </button>
  );
}

function AgentCard({ agent, onOpen }: { agent: Agent; onOpen: () => void }) {
  const meta = providerMeta[agent.model_provider] ?? providerMeta.gemini;
  const tagLine = agent.tags?.slice(0, 3).join(" · ") || null;
  const updatedAt = agent.updated_at ? new Date(agent.updated_at).toLocaleDateString() : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition",
        "hover:border-brand-primary-500/40 hover:shadow-md",
        "dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-brand-primary-500/35"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
              meta.chip
            )}
          >
            {meta.label}
          </span>
          <h3 className="mt-2 text-base font-semibold text-neutral-900 dark:text-neutral-50">{agent.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {agent.description || "Sem descrição — adicione uma para orientar o uso do agente."}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-brand-primary-600 transition group-hover:bg-brand-primary-500/15 dark:bg-neutral-900 dark:text-brand-primary-400">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          {agent.role || "Assistente"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <BrainCircuit className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          {agent.tools?.length ? `${agent.tools.length} ferramentas` : "Sem ferramentas"}
        </span>
        {updatedAt ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            Atualizado {updatedAt}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        <span className="min-w-0 truncate text-xs text-neutral-400 dark:text-neutral-500">{tagLine || "Sem tags"}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-primary-600 dark:text-brand-primary-400">
          Abrir
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
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
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        agent.name.toLowerCase().includes(q) ||
        (agent.description || "").toLowerCase().includes(q) ||
        (agent.role || "").toLowerCase().includes(q);

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
    <div className="flex min-h-full flex-col gap-6 bg-neutral-50/50 p-4 pb-8 dark:bg-neutral-950">
      <div className="rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-white via-white to-neutral-50/80 p-6 shadow-sm dark:border-neutral-800 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary-600 dark:text-brand-primary-400">
              Weave AI · Agentes
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Crie e gerencie assistentes sob medida
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Defina instruções, modelo e base de conhecimento. Use na equipe com comportamento consistente e rastreável.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadAgents()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => router.push("/app/weave-ai/agent/new")}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-primary-500 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-brand-primary-400"
            >
              <Plus className="h-4 w-4" />
              Novo agente
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Sparkles}
          label="Agentes ativos"
          value={String(stats.total)}
          description="Disponíveis para uso na organização"
        />
        <StatCard
          icon={ShieldCheck}
          label="Com conhecimento"
          value={String(stats.knowledgeEnabled)}
          description="Arquivos anexados à base do agente"
        />
        <StatCard
          icon={BrainCircuit}
          label="Gemini"
          value={String(stats.gemini)}
          description="Modelos Google"
        />
        <StatCard
          icon={Filter}
          label="Perplexity"
          value={String(stats.perplexity)}
          description="Modelos Sonar"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, função ou descrição"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50/80 pr-3 pl-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Provedor</span>
          <ProviderChip id="all" label="Todos" selected={providerFilter === "all"} onSelect={setProviderFilter} />
          <ProviderChip id="gemini" label="Gemini" selected={providerFilter === "gemini"} onSelect={setProviderFilter} />
          <ProviderChip
            id="perplexity"
            label="Perplexity"
            selected={providerFilter === "perplexity"}
            onSelect={setProviderFilter}
          />
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center dark:border-neutral-700 dark:bg-neutral-950">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary-500/15 text-brand-primary-600 dark:text-brand-primary-400">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Nenhum agente nesta lista</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {agents.length === 0
              ? "Comece criando um agente com instruções claras e, se quiser, arquivos de referência."
              : "Tente outro termo de busca ou altere o filtro de provedor."}
          </p>
          <Link
            href="/app/weave-ai/agent/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-brand-primary-400"
          >
            <Plus className="h-4 w-4" />
            Criar agente
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onOpen={() => router.push(`/app/weave-ai/agent/${agent.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
