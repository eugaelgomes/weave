"use client";

import React from "react";
import Link from "next/link";
import { FaHome, FaArrowLeft } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mb-4 text-8xl font-bold text-yellow-500">404</div>
          <h1 className="mb-3 text-3xl font-bold text-neutral-100">Página não encontrada</h1>
          <p className="text-neutral-400">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-neutral-700 bg-neutral-900/30 px-6 py-3 text-neutral-300 transition-all hover:border-neutral-600 hover:bg-neutral-800/50"
          >
            <FaArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-yellow-500 px-6 py-3 font-semibold text-neutral-950 transition-all hover:bg-yellow-400"
          >
            <FaHome className="h-4 w-4" />
            Ir para o Início
          </Link>
        </div>

        <div className="mt-8 border-t border-neutral-800/50 pt-6">
          <p className="mb-3 text-sm text-neutral-500">Links úteis</p>
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
              href="/about"
              className="text-neutral-400 transition-colors hover:text-yellow-500"
            >
              Sobre
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
