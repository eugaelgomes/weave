"use client";

import CanvasView from "@/app/(protected)/weave-flow/_components/CanvasView";

export default function WeaveFlowPage() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <header className="shrink-0 border-b border-neutral-200 px-4 py-6 md:px-6 dark:border-neutral-800/80">
        <div className="flex max-w-3xl flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 md:text-3xl dark:text-neutral-50">
            Weave Flow
          </h1>
          <p className="text-sm leading-relaxed text-neutral-500 md:text-base dark:text-neutral-400">
            A Weave apresenta macro-projetos e épicos em um canvas infinito para acompanhar o fluxo
            de valor — Discovery, Design, validação, execução e rollout — sem micro-gerir tarefas
            operacionais.
          </p>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <CanvasView />
      </div>
    </div>
  );
}
