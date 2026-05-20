"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  engineShellClass,
  engineSubmitButtonClass,
  engineTextLinkClass,
} from "@/app/(protected)/home/_components/engine-styles";

export type ComposeShellProps = {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  step: number;
  totalSteps: number;
  stepLabel: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
};

export function ComposeShell({
  title,
  subtitle,
  backHref,
  backLabel,
  step,
  totalSteps,
  stepLabel,
  children,
  sidebar,
  primaryAction,
  secondaryAction,
}: ComposeShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={backHref}
            className={cn(engineTextLinkClass, "mb-2 inline-flex items-center gap-1")}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            {backLabel}
          </Link>
          <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-[12px] font-normal text-neutral-500 dark:text-neutral-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {stepLabel}
          </p>
          <p className="text-[12px] font-medium text-neutral-700 dark:text-neutral-300">
            {step} / {totalSteps}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className={cn(engineShellClass, "min-h-[320px]")}>{children}</section>
        {sidebar ? (
          <aside className={cn(engineShellClass, "hidden lg:flex lg:flex-col lg:gap-3")}>
            {sidebar}
          </aside>
        ) : null}
      </div>

      {(primaryAction || secondaryAction) && (
        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className={engineTextLinkClass}
            >
              {secondaryAction.label}
            </button>
          ) : null}
          {primaryAction ? (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              className={engineSubmitButtonClass}
            >
              {primaryAction.loading ? "…" : primaryAction.label}
            </button>
          ) : null}
        </footer>
      )}
    </div>
  );
}
