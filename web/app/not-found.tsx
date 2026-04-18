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
      <div className="bg-brand-primary-500/5 pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full blur-3xl" />
      <div className="bg-brand-primary-500/5 pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full blur-3xl" />

      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="text-brand-primary-500/20 mb-2 text-[8rem] leading-none font-black tracking-tighter">
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
            className="bg-brand-primary-500/90 hover:bg-brand-primary-500 flex w-full items-center justify-center gap-2 rounded-md px-6 py-3 font-semibold text-neutral-950 transition-all"
          >
            <FaArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <Link
            href="/home"
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
              <Link href="/support/" className="tex-underline text-brand-primary-500 font-semibold">
                Clique aqui
              </Link>{" "}
              e veja nosso repositório de ajuda ou entre em contato com o suporte.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/notes"
              className="hover:text-brand-primary-500 text-neutral-400 transition-colors"
            >
              Tarefas
            </Link>
            <Link
              href="/projects"
              className="hover:text-brand-primary-500 text-neutral-400 transition-colors"
            >
              Projetos
            </Link>
            <Link
              href="/settings"
              className="hover:text-brand-primary-500 text-neutral-400 transition-colors"
            >
              Configurações
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
