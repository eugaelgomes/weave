"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FaHome, FaRedo, FaExclamationTriangle } from "react-icons/fa";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Erro capturado:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <FaExclamationTriangle className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
          <h1 className="mb-3 text-3xl font-bold text-neutral-100">Algo deu errado</h1>
          <p className="text-neutral-400">
            Ocorreu um erro inesperado. Tente recarregar a página ou voltar ao início.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 rounded-md border border-neutral-800/50 bg-neutral-900/50 p-4 text-left">
            <p className="mb-2 text-xs text-neutral-500">Detalhes do erro (desenvolvimento):</p>
            <code className="text-xs break-all text-yellow-500">{error.message}</code>
            {error.digest && <p className="mt-2 text-xs text-neutral-500">ID: {error.digest}</p>}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-500/90 px-6 py-3 font-semibold text-neutral-950 transition-all hover:bg-yellow-500"
          >
            <FaRedo className="h-4 w-4" />
            Tentar Novamente
          </button>

          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-700 px-6 py-3 text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-900/50"
          >
            <FaHome className="h-4 w-4" />
            Ir para o Início
          </Link>
        </div>

        <div className="mt-8 border-t border-neutral-800/50 pt-6">
          <p className="mb-3 text-sm text-neutral-500">Precisa de ajuda?</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/app/home"
              className="text-neutral-400 transition-colors hover:text-yellow-500"
            >
              Início
            </Link>
            <Link
              href="/app/notes"
              className="text-neutral-400 transition-colors hover:text-yellow-500"
            >
              Notas
            </Link>
            <Link
              href="/app/settings"
              className="text-neutral-400 transition-colors hover:text-yellow-500"
            >
              Configurações
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
