"use client";

import { XCircle, X } from "lucide-react";
import { getTranslations, LocaleKey } from "@/app/auth/_i18n";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  locale?: LocaleKey;
}

export function ErrorModal({ isOpen, onClose, title, message, locale = "pt-br" }: ErrorModalProps) {
  const t = getTranslations(locale);
  const displayTitle = title || t.errors.defaultTitle;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm transition-all">
      <div className="animate-in fade-in zoom-in-95 relative w-full max-w-[400px] flex-col overflow-hidden rounded-2xl bg-white p-6 shadow-2xl duration-200 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mt-2 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-7 w-7 text-red-500" />
          </div>

          <h2 className="mb-2 text-xl font-bold text-slate-950">{displayTitle}</h2>

          <p className="mb-6 text-sm leading-relaxed text-slate-500">{message}</p>

          <button
            onClick={onClose}
            className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-slate-800 active:scale-95"
          >
            {t.errors.tryAgain}
          </button>
        </div>
      </div>
    </div>
  );
}
