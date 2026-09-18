"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Legacy Agent House URL kept as a route alias for existing links. */
export default function LegacyAgentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  useEffect(() => {
    if (id) router.replace(`/agents/${id}`);
  }, [id, router]);

  return (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-neutral-400">
      <Loader2 size={14} className="animate-spin" /> Abrindo agente...
    </div>
  );
}
