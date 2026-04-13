"use client";

import React from "react";
import Link from "next/link";
import { FaHome, FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white">
      {/* Decorative background glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-primary-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-brand-primary-500/5 blur-3xl" />

      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mb-2 text-[8rem] leading-none font-black tracking-tighter text-brand-primary-500/20">
            404
          </div>
          <h1 className="mb-3 text-3xl font-bold text-neutral-950">Página não encontrada</h1>
          <p className="text-neutral-400">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-brand-primary-500/90 px-6 py-3 font-semibold text-neutral-950 transition-all hover:bg-brand-primary-500"
          >
            <FaArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <Link
            href="/app/home"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-700 px-6 py-3 text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-900/50"
          >
            <FaHome className="h-4 w-4" />
            Ir para o Início
          </Link>
        </div>

        <div className="mt-8 space-y-2 border-t border-neutral-800/50 pt-6">
          <div className="">
            <p className="text-sm text-neutral-500">
              Precisa de ajuda?{" "}
              <Link href="/support/" className="tex-underline font-semibold text-brand-primary-500">
                Clique aqui
              </Link>{" "}
              e veja nosso repositório de ajuda ou entre em contato com o suporte.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/app/notes"
              className="text-neutral-400 transition-colors hover:text-brand-primary-500"
            >
              Notas
            </Link>
            <Link
              href="/app/projects"
              className="text-neutral-400 transition-colors hover:text-brand-primary-500"
            >
              Projetos
            </Link>
            <Link
              href="/app/settings"
              className="text-neutral-400 transition-colors hover:text-brand-primary-500"
            >
              Configurações
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
