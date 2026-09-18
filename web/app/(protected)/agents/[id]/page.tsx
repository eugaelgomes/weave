"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import AgentForm from "@/app/(protected)/_components/agent/agent-form";
import { useAgent, type Agent } from "@/app/_contexts/agent-context";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EditAgentPage() {
  const router = useRouter();
  const params = useParams();
  const { getAgent } = useAgent();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchAgent() {
      if (!params.id) return;

      try {
        const data = await getAgent(params.id as string);
        if (isMounted) {
          setAgent(data);
        }
      } catch (err: any) {
        if (isMounted) {
          toast.error("Erro ao carregar o agente.");
          router.push("/home");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAgent();

    return () => {
      isMounted = false;
    };
  }, [params.id, getAgent, router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-50 dark:bg-[#121212]">
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-sm font-medium">Carregando agente...</span>
        </div>
      </div>
    );
  }

  return (
    <AgentForm
      agent={agent}
      onCancel={() => router.push("/home")}
      onSuccess={() => router.push("/home")}
    />
  );
}
