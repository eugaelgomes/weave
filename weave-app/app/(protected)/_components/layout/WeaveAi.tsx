"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";
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
          "print:hidden fixed z-[106] flex h-14 w-14 items-center justify-center rounded-xl shadow-lg transition hover:scale-[1.03] active:scale-[0.98]",
          "bottom-5 right-5 md:bottom-10 md:right-8",
          "bg-brand-primary-500 text-neutral-900 hover:bg-brand-primary-400",
          "focus-visible:ring-brand-primary-400 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none dark:text-neutral-950 dark:focus-visible:ring-offset-neutral-900"
        )}
        aria-haspopup="dialog"
        aria-label={open ? t.common.close : t.nav.weaveAi}
      >
        {open ? (
          <X className="h-6 w-6" strokeWidth={2} aria-hidden />
        ) : (
          <>W.AI</>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[104] bg-neutral-950/50 backdrop-blur-sm"
              aria-label={t.common.close}
              onClick={() => setOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="weave-ai-modal-title"
              className="fixed right-4 bottom-24 z-[105] flex w-[min(28rem,calc(100vw-2rem))] max-h-[min(75vh,600px)] min-h-[min(42vh,360px)] flex-col overflow-hidden rounded-t-2xl border border-neutral-200 bg-white shadow-2xl sm:bottom-28 sm:right-6 sm:rounded-xl md:right-8 dark:border-surface-dark-border dark:bg-[#1d1d1b] max-sm:left-4 max-sm:right-4 max-sm:w-auto"
            >
              <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-neutral-200 px-3 dark:border-surface-dark-border">
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
                    className="text-[10px] font-semibold text-brand-primary-600 hover:underline dark:text-brand-primary-400"
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
