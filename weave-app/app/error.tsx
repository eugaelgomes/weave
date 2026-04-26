"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Erro capturado:", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-50 dark:bg-neutral-950">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-amber-200/90 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40">
              <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Algo deu errado
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              Ocorreu um erro inesperado. Você pode tentar de novo ou voltar ao início.
            </p>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-left dark:border-neutral-800 dark:bg-neutral-900/50">
              <p className="mb-1.5 text-[11px] font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-500">
                Desenvolvimento
              </p>
              <code className="block text-xs break-all text-neutral-800 dark:text-neutral-200">
                {error.message}
              </code>
              {error.digest ? (
                <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-500">
                  Digest: {error.digest}
                </p>
              ) : null}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={reset}
              className="bg-brand-primary-500 hover:bg-brand-primary-800 inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <RotateCw className="h-4 w-4 shrink-0" aria-hidden />
              Tentar novamente
            </button>
            <Link
              href="/home"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden />
              Início
            </Link>
          </div>

          <nav className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-neutral-200 pt-6 text-sm dark:border-neutral-800">
            <Link
              href="/notes"
              className="hover:text-brand-primary-600 dark:hover:text-brand-primary-400 text-neutral-500 transition-colors dark:text-neutral-400"
            >
              Tarefas
            </Link>
            <Link
              href="/settings"
              className="hover:text-brand-primary-600 dark:hover:text-brand-primary-400 text-neutral-500 transition-colors dark:text-neutral-400"
            >
              Configurações
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
