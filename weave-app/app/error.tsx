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
    <div className="flex min-h-[100dvh] flex-col bg-neutral-50 dark:bg-[#1d1d1b]">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="dark:shadow-surface-dark-sm dark:border-surface-dark-border w-full max-w-[420px] rounded-lg border border-neutral-200 bg-white p-8 shadow-sm dark:bg-[#1d1d1b]">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-amber-200/90 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40">
              <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" aria-hidden />
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              An unexpected error occurred. You can try again or return to the homepage.
            </p>
          </div>

          {process.env.NODE_ENV === "development" && (
            <div className="dark:border-surface-dark-border mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-left dark:bg-[#1d1d1b]/50">
              <p className="mb-1.5 text-[11px] font-medium tracking-wide text-neutral-500 uppercase dark:text-neutral-500">
                Development
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
              Try again
            </button>
            <Link
              href="/weave-engine"
              className="dark:border-surface-dark-border-strong inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 dark:bg-[#1d1d1b] dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              <Home className="h-4 w-4 shrink-0" aria-hidden />
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
