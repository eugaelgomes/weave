"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Legacy Agent House URL kept as a route alias for existing links. */
export default function NewAgentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/agents/new");
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center gap-2 text-xs text-neutral-400">
      <Loader2 size={14} className="animate-spin" /> Abrindo novo agente...
    </div>
  );
}
