"use client";

import React from "react";
import { Braces } from "lucide-react";

export default function BatchesPage() {
  return (
    <div className="flex h-full min-h-[400px] flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
        <Braces className="size-7" />
      </div>
      <h1 className="mt-4 text-xl font-semibold text-neutral-900 dark:text-white">
        Batch Processing
      </h1>
      <p className="mt-1.5 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
        Execução assíncrona em lote com custos reduzidos para grandes volumes de dados.
      </p>
    </div>
  );
}
