"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";

const PagesFooter = () => {
  const { t } = useLanguage();
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL || "https://discover.weavenotes.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app";
  const currentYear = new Date().getFullYear();

  const linkClass =
    "text-brand-navy/85 underline-offset-2 hover:text-brand-yellow hover:underline  dark:hover:text-brand-yellow";

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-md bg-white/20 px-4 py-1 shadow-sm sm:flex-row">
      {/* Copyright & Brand — yellow is primary brand accent */}
      <div className="dark:text-brand-beige text-[9px] font-medium text-white">
        &copy; {currentYear}{" "}
        <a
          href={blogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-yellow hover:text-brand-orange dark:text-brand-yellow dark:hover:text-brand-orange font-bold drop-shadow-[0_0.5px_0_rgba(8,61,119,0.35)] transition-colors dark:drop-shadow-none"
        >
          Weave Notes
        </a>
      </div>

      <div className="flex items-center gap-4 text-[9px] font-medium text-white">
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
