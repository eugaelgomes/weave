"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAgent, type Agent } from "@/app/_contexts/agent-context";
import {
  BrainCircuit,
  Clock3,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Trash2,
  Ban,
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
        "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
        selected
          ? "bg-neutral-800 text-white shadow-sm dark:bg-neutral-200 dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
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
        "group flex h-full flex-col rounded-md border border-neutral-200 bg-white p-4 text-left shadow-sm transition",
        "hover:border-brand-primary-500/40 hover:shadow-md",
        "dark:hover:border-brand-primary-500/35 dark:border-neutral-800 dark:bg-neutral-950"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset",
                meta.chip
              )}
            >
              {meta.label}
            </span>
            {agent.is_active === false && (
              <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600 ring-1 ring-inset ring-neutral-500/20 dark:bg-neutral-800/50 dark:text-neutral-400">
                Inativo
              </span>
            )}
            {agent.project_id && (
              <span className="inline-flex items-center rounded-full bg-brand-primary-50 px-2 py-0.5 text-[10px] font-semibold text-brand-primary-700 ring-1 ring-inset ring-brand-primary-500/20 dark:bg-brand-primary-500/10 dark:text-brand-primary-400">
                Projeto
              </span>
            )}
          </div>
          <h3 className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            {agent.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
            {agent.description || "Sem descrição — adicione uma para orientar o uso do agente."}
          </p>
        </div>
        <div className="text-brand-primary-600 group-hover:bg-brand-primary-500/15 dark:text-brand-primary-400 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 transition dark:bg-neutral-900">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-neutral-500 dark:text-neutral-400">
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
        <span className="min-w-0 truncate text-[11px] text-neutral-400 dark:text-neutral-500">
          {tagLine || "Sem tags"}
        </span>
        <span className="text-brand-primary-600 dark:text-brand-primary-400 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold">
          Abrir
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
}

export default function AgentsOverviewPage() {
  const router = useRouter();
  const { agents } = useAgent();
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

  return (
    <div className="flex min-h-full flex-col gap-4 bg-neutral-50/50 p-4 pb-8 dark:bg-neutral-950">
      <div className="flex justify-between gap-2">
        <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Agentes AI
        </h1>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Gerencie os assistentes sob medida da sua organização.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-2 shadow-sm xl:flex-row xl:items-center xl:justify-between dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar agente..."
              className="focus:border-brand-primary-500 focus:ring-brand-primary-500/50 h-8 w-full rounded-md border border-neutral-200 bg-neutral-50/50 pr-3 pl-8 text-xs text-neutral-900 placeholder:text-neutral-400 focus:ring-1 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>

          <div className="hidden h-4 w-px bg-neutral-200 sm:block dark:bg-neutral-800" />

          <div className="flex items-center gap-1.5">
            <ProviderChip
              id="all"
              label="Todos"
              selected={providerFilter === "all"}
              onSelect={setProviderFilter}
            />
            <ProviderChip
              id="gemini"
              label="Gemini"
              selected={providerFilter === "gemini"}
              onSelect={setProviderFilter}
            />
            <ProviderChip
              id="perplexity"
              label="Perplexity"
              selected={providerFilter === "perplexity"}
              onSelect={setProviderFilter}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-neutral-100 pt-2 xl:border-0 xl:pt-0 dark:border-neutral-800">
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            title="Desativar agentes selecionados"
          >
            <Ban className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Desativar</span>
          </button>

          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-xs font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-red-400 dark:hover:border-red-900/50 dark:hover:bg-red-900/20"
            title="Deletar agentes selecionados"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Deletar</span>
          </button>

          <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

          <button
            type="button"
            onClick={() => router.push("/weave-ai/agent/new")}
            className="bg-brand-primary-500 hover:bg-brand-primary-400 flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-neutral-900 shadow-sm transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Agente
          </button>
        </div>
      </div>

      {filteredAgents.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-neutral-300 bg-white px-6 py-16 text-center dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
            <Search className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Nenhum agente encontrado
          </h2>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {agents.length === 0
              ? "Crie seu primeiro agente com instruções personalizadas para iniciar."
              : "Tente outro termo de busca ou altere o filtro selecionado."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onOpen={() => router.push(`/weave-ai/agent/${agent.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
