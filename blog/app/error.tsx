"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FaHome, FaRedoAlt } from "react-icons/fa";
import { HiExclamationTriangle } from "react-icons/hi2";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled Application Error:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-4 font-sans dark:bg-neutral-950">
      
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)]" />
      
      <div className="absolute left-1/2 top-1/2 -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 opacity-10 blur-[100px] dark:bg-red-600/10" />

      <div className="relative z-10 w-full max-w-md text-center">
        
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-200 bg-red-100/50 text-red-600 shadow-sm backdrop-blur-sm dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-500">
            <HiExclamationTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
            Algo deu errado
          </h1>
        </div>

        <p className="mb-8 text-sm font-medium text-neutral-600 dark:text-neutral-400 sm:text-base">
          Ocorreu um erro inesperado ao processar esta tela. Não se preocupe, seus dados estão seguros.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="group flex h-11 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-6 text-sm font-bold text-white transition-all hover:bg-neutral-800 hover:shadow-md dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 sm:w-auto"
          >
            <FaRedoAlt className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-180" />
            Tentar novamente
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-6 text-sm font-bold text-neutral-700 transition-all hover:bg-neutral-50 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 sm:w-auto"
          >
            <FaHome className="h-3.5 w-3.5" />
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}