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
            "group toast gap-3 rounded-lg border border-neutral-200 bg-white p-4 font-sans text-sm text-neutral-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-50",
          title: "text-[0.9375rem] font-semibold leading-snug text-neutral-900 dark:text-neutral-50",
          description: "text-[0.8125rem] leading-relaxed text-neutral-600 dark:text-neutral-400",
          icon: "text-neutral-500 dark:text-neutral-400",
          content: "gap-1",
          closeButton:
            "absolute top-3 right-3 rounded-md border border-transparent text-neutral-500 transition-colors hover:border-neutral-200 hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
          actionButton:
            "rounded-md bg-brand-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-primary-800",
          cancelButton:
            "rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800",
          success:
            "border-emerald-200/90 bg-emerald-50 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100 [&_.description]:text-emerald-800/90 dark:[&_.description]:text-emerald-200/80",
          error:
            "border-red-200/90 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100 [&_.description]:text-red-800/90 dark:[&_.description]:text-red-200/80",
          warning:
            "border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100 [&_.description]:text-amber-900/85 dark:[&_.description]:text-amber-200/80",
          info:
            "border-sky-200/90 bg-sky-50 text-sky-950 dark:border-sky-800/50 dark:bg-sky-950/35 dark:text-sky-100 [&_.description]:text-sky-900/85 dark:[&_.description]:text-sky-200/80",
          loading:
            "border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/80",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
