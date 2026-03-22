"use client";

"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useAgent } from "@/app/_contexts/agent-context";
import { Agent } from "@/app/_services/ai-agent-service/agent-service";
import { AgentForm } from "../_components/agent-form";
import { useParams } from "next/navigation";

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
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!agent) {
    return <div className="flex h-full items-center justify-center">Agent not found</div>;
  }

  return <AgentForm initialData={agent} isEditing />;
}
