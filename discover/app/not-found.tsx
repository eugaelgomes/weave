"use client";

import React from "react";
import Link from "next/link";
import { FaHome, FaArrowLeft, FaCompass } from "react-icons/fa";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4 font-sans dark:bg-neutral-950">
      
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)]" />
      
      <div className="absolute left-1/2 top-1/2 -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400 opacity-20 blur-[100px] dark:bg-brand-primary-500/10" />

      <div className="relative z-10 w-full max-w-md text-center">
        
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-200 bg-yellow-100/50 text-yellow-600 shadow-sm backdrop-blur-sm dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-brand-primary-500">
            <FaCompass className="h-8 w-8 animate-pulse" />
          </div>
          <h1 className="text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-neutral-800 to-neutral-400 dark:from-neutral-100 dark:to-neutral-600">
            404
          </h1>
        </div>

        <h2 className="mb-3 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-3xl">
          Página não encontrada
        </h2>
        <p className="mb-8 text-sm font-medium text-neutral-600 dark:text-neutral-400 sm:text-base">
          Parece que você navegou para fora do mapa. A página que você está procurando foi movida, excluída ou nunca existiu.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => router.back()}
            className="group flex h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-6 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:w-auto"
          >
            <FaArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
            Voltar
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-primary-500 px-6 text-sm font-bold text-neutral-950 transition-all hover:bg-yellow-400 hover:shadow-md sm:w-auto"
          >
            <FaHome className="h-3.5 w-3.5" />
            Ir para o Início
          </Link>
        </div>
      </div>
    </div>
  );
}