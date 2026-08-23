"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { routes } from "@/app/_utils/routes";
import { ArrowLeft, FileQuestionMark, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const { user, authenticated } = useAuth();

  const homeHref = authenticated && user ? routes.home() : routes.auth.signIn();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-50 dark:bg-[#1d1d1b]">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="dark:shadow-surface-dark-sm dark:border-surface-dark-border w-full max-w-[420px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:bg-[#1d1d1b]">
          <div className="mb-6 flex justify-center">
            <div className="dark:border-surface-dark-border-strong flex h-14 w-14 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 dark:bg-[#1d1d1b]/80">
              <FileQuestionMark
                className="h-7 w-7 text-neutral-600 dark:text-neutral-300"
                aria-hidden
              />
            </div>
          </div>

          <div className="text-center">
            <p className="dark:border-surface-dark-border-strong mb-3 inline-flex rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-neutral-600 dark:bg-[#1d1d1b] dark:text-neutral-400">
              404
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Página não encontrada
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              O endereço não existe ou foi movido.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-brand-primary-500 hover:bg-brand-primary-800 inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Voltar
            </button>
            <Link
              href={homeHref}
              className="dark:border-surface-dark-border-strong inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden />
              Início
            </Link>
          </div>

          <nav className="dark:border-surface-dark-border mt-8 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-neutral-200 pt-6 text-sm">
            <Link
              href={authenticated && user ? routes.notes.list() : routes.auth.signIn()}
              className="hover:text-brand-primary-600 dark:hover:text-brand-primary-400 text-neutral-500 transition-colors dark:text-neutral-400"
            >
              Tarefas
            </Link>
            <Link
              href={authenticated && user ? routes.projects.list() : routes.auth.signIn()}
              className="hover:text-brand-primary-600 dark:hover:text-brand-primary-400 text-neutral-500 transition-colors dark:text-neutral-400"
            >
              Projetos
            </Link>
            <Link
              href={authenticated && user ? routes.settings.base() : routes.auth.signIn()}
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
