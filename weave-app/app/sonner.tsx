"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/app/_contexts/theme-context";

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group [--width:min(100vw-2rem,22rem)]"
      toastOptions={{
        classNames: {
          toast:
            "group toast gap-3 rounded-lg border border-neutral-200 bg-white p-4 font-sans text-sm text-neutral-900 shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:text-neutral-50 dark:shadow-surface-dark-md",
          title: "text-[0.9375rem] font-semibold leading-snug text-neutral-900 dark:text-neutral-50",
          description: "text-[0.8125rem] leading-relaxed text-neutral-600 dark:text-neutral-400",
          icon: "text-neutral-500 dark:text-neutral-400",
          content: "gap-1",
          closeButton:
            "absolute top-3 right-3 rounded-md border border-transparent text-neutral-500 transition-colors hover:border-neutral-200 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:border-surface-dark-border-strong dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
          actionButton:
            "rounded-md bg-brand-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-800",
          cancelButton:
            "rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-surface-dark-border-strong dark:text-neutral-300 dark:hover:bg-neutral-800",
          success:
            "border-neutral-200 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-md border-l-[3px] border-l-emerald-500/80 text-neutral-900 dark:text-neutral-50 [&_.description]:text-neutral-600 dark:[&_.description]:text-neutral-400",
          error:
            "border-neutral-200 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-md border-l-[3px] border-l-red-500/80 text-neutral-900 dark:text-neutral-50 [&_.description]:text-neutral-600 dark:[&_.description]:text-neutral-400",
          warning:
            "border-neutral-200 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-md border-l-[3px] border-l-amber-500/80 text-neutral-900 dark:text-neutral-50 [&_.description]:text-neutral-600 dark:[&_.description]:text-neutral-400",
          info:
            "border-neutral-200 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-md border-l-[3px] border-l-sky-500/80 text-neutral-900 dark:text-neutral-50 [&_.description]:text-neutral-600 dark:[&_.description]:text-neutral-400",
          loading:
            "border-neutral-200 bg-neutral-50 shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]/80 dark:shadow-surface-dark-sm",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
