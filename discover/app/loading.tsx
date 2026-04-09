"use client";

import React from "react";
import { HiSparkles } from "react-icons/hi2";
import { useLanguage } from "./contexts/LanguageContext";

export default function Loading() {
  const { t } = useLanguage();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950">
      <div className="relative flex items-center justify-center">
        
        <div className="absolute h-16 w-16 animate-ping rounded-full bg-yellow-400 opacity-20 dark:bg-brand-primary-700/20" />
        
        <div className="absolute h-24 w-24 rounded-full bg-yellow-400/20 blur-xl dark:bg-brand-primary-700/10" />

        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-yellow-900/30 dark:bg-neutral-900/80">
          <div className="animate-pulse">
            <HiSparkles className="h-6 w-6 text-brand-primary-700 dark:text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1 text-center">
        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          {t.loading.title}
        </h3>
        <p className="animate-pulse text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {t.loading.message}
        </p>
      </div>
    </div>
  );
}