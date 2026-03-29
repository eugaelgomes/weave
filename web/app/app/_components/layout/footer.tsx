"use client";

import React from "react";

const PagesFooter = () => {
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL || "https://discover.weavenotes.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://weavenotes.app";
  const currentYear = new Date().getFullYear();

  const linkClass = "hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors";

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-md border border-neutral-200/50 bg-neutral-50/50 px-4 py-2.5 shadow-sm sm:flex-row dark:border-neutral-800/50 dark:bg-neutral-950/50 backdrop-blur-sm">
      
      {/* Copyright & Brand */}
      <div className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
        &copy; {currentYear}{" "}
        <a
          href={blogUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-amber-600/70 hover:text-amber-600 dark:text-amber-500/40 dark:hover:text-amber-500 transition-colors"
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
          Privacidade
        </a>
        <a
          href={`${blogUrl}/terms`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Termos
        </a>
        <a 
          href={`${blogUrl}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Documentações
        </a>
        <a
          href={`${appUrl}/support/`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Ajuda
        </a>
      </div>
    </div>
  );
};

export default PagesFooter;