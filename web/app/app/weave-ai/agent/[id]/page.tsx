"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAgent } from "@/app/_contexts/agent-context";
import { Agent } from "@/app/_services/ai-agent-service/agent-service";
import { AgentForm } from "../_components/agent-form";

function AgentDetailSkeleton() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <Loader2 className="h-8 w-8 animate-spin text-brand-primary-500" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">Carregando agente…</p>
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

  if (loading) {
    return <AgentDetailSkeleton />;
  }

  if (!agent) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Agente não encontrado</p>
        <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
          O link pode estar incorreto ou você não tem mais acesso a este agente.
        </p>
        <Link
          href="/app/weave-ai/agent"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à visão geral
        </Link>
      </div>
    );
  }

  return <AgentForm initialData={agent} isEditing />;
}
