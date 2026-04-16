"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";

const PagesFooter = () => {
  const { t } = useLanguage();
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL || "https://discover.weavenotes.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app";
  const currentYear = new Date().getFullYear();

  const linkClass = "hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors";

  return (
    <div className="dark:bg-brand-secondary-950/50 flex flex-col items-center justify-between gap-4 rounded-md border border-neutral-200/50 bg-white/50 px-4 py-2 shadow-sm backdrop-blur-sm sm:flex-row dark:border-neutral-800/50">
      {/* Copyright & Brand */}
      <div className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        &copy; {currentYear}{" "}
        <a
          href={blogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-primary-500 hover:text-brand-primary-500 dark:text-brand-primary-500/40 dark:hover:text-brand-primary-500 font-bold transition-colors"
        >
          Weave Notes
        </a>
      </div>

      <div className="flex items-center gap-4 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        <a
          href={`${blogUrl}/privacy`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {t.footer.privacy}
        </a>
        <a
          href={`${blogUrl}/terms`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {t.footer.terms}
        </a>
        <a href={`${blogUrl}/docs`} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {t.footer.docs}
        </a>
        <a
          href={`${appUrl}/support/`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          {t.footer.help}
        </a>
      </div>
    </div>
  );
};

export default PagesFooter;
