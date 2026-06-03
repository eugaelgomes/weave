"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { cn } from "@/lib/utils";
import ChatInterface from "@/app/(protected)/weave-ai/_components/chat-interface";
import { AiFredokaIcon } from "@/app/(protected)/_components/layout/icons/ai-fredoka-icon";

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
      {/* Botão flutuante (Nuvem) - Só aparece quando o chat está fechado */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "fixed z-[106] flex h-14 w-14 items-center justify-center print:hidden",
            "right-5 bottom-5 md:right-8 md:bottom-5",
            // Formato irregular "nuvem" (blob orgânico com morph no hover)
            "rounded-[43%_57%_36%_64%_/_47%_60%_40%_53%] hover:rounded-[57%_43%_64%_36%_/_60%_47%_53%_40%]",
            // Sem bordas, fundo translúcido (efeito glassmorphism)
            "bg-white/60 backdrop-blur-md text-neutral-800",
            "dark:bg-[#1d1d1b]/60 dark:text-neutral-200",
            // Sombras suaves
            "shadow-xl shadow-black/10 dark:shadow-black/40",
            // Animações e transição para cor sólida no hover
            "transition-all duration-300 ease-out",
            "hover:bg-white dark:hover:bg-[#1d1d1b]",
            "hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/15 dark:hover:shadow-black/50 active:translate-y-0 active:scale-95",
            // Acessibilidade
            "focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-neutral-900"
          )}
          aria-haspopup="dialog"
          aria-label={t.nav.weaveAi}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <AiFredokaIcon className="absolute text-[1.4rem]" aria-hidden={false} />
          </div>
        </button>
      )}

      {/* Modal Centralizado Imersivo */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center print:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm transition-opacity dark:bg-neutral-950/60"
              aria-label={t.common.close}
              onClick={() => setOpen(false)}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="weave-ai-modal-title"
              className="dark:border-surface-dark-border dark:shadow-surface-dark-2xl relative z-[111] flex h-[85vh] w-[92vw] max-w-5xl flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 dark:bg-[#1d1d1b] dark:ring-white/10"
            >
              <ChatInterface variant="widget" onClose={() => setOpen(false)} />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
