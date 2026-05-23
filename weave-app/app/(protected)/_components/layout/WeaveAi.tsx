"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";
import ChatWidget from "@/app/(protected)/_components/ui/weave-ai/chat-widget";

export default function WeaveAi() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/weave-ai")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "fixed z-[106] flex h-14 w-14 items-center justify-center rounded-full print:hidden",
          "right-5 bottom-5 md:right-8 md:bottom-5",
          // Estilo Clean (Branco com borda sutil)
          "bg-white text-neutral-800 border border-neutral-200/60",
          "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] dark:bg-[#1d1d1b] dark:text-neutral-200 dark:border-neutral-800 dark:shadow-none",
          // Animações
          "transition-all duration-300 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_8px_25px_-4px_rgba(0,0,0,0.12)] active:translate-y-0 active:scale-95",
          // Acessibilidade
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
        )}
        aria-haspopup="dialog"
        aria-label={open ? t.common.close : t.nav.weaveAi}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <span
            className={cn(
              "absolute text-[1.1rem] transition-all duration-300 ease-in-out font-medium",
              open ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
            )}
            // Caso já tenha a Fredoka configurada no Tailwind (ex: font-fredoka), você pode remover o style e usar a classe lá em cima.
            style={{ fontFamily: "'Fredoka', sans-serif", letterSpacing: "-0.02em" }}
            aria-hidden={open}
          >
            w.ai
          </span>
          <X
            strokeWidth={2}
            className={cn(
              "absolute h-6 w-6 transition-all duration-300 ease-in-out",
              open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0 text-neutral-400"
            )}
            aria-hidden={!open}
          />
        </div>
      </button>

      {mounted &&
        open &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[104] bg-neutral-950/20 backdrop-blur-[2px] transition-opacity dark:bg-neutral-950/50"
              aria-label={t.common.close}
              onClick={() => setOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="weave-ai-modal-title"
              className="dark:border-surface-dark-border fixed right-4 bottom-24 z-[105] flex max-h-[min(75vh,600px)] min-h-[min(42vh,360px)] w-[min(28rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-2xl max-sm:right-4 max-sm:left-4 max-sm:w-auto sm:right-6 sm:bottom-28 sm:rounded-xl md:right-8 dark:bg-[#1d1d1b]"
            >
              <div className="dark:border-surface-dark-border flex h-12 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3">
                <h2
                  id="weave-ai-modal-title"
                  className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-100"
                >
                  {t.nav.weaveAi}
                </h2>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href="/weave-ai/chat"
                    onClick={() => setOpen(false)}
                    className="text-neutral-500 dark:text-neutral-400 text-[10px] font-medium hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
                  >
                    {t.nav.weaveAiOpenFull}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                    aria-label={t.common.close}
                  >
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                <ChatWidget maxHeight="100%" className="h-full border-0 shadow-none" />
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}