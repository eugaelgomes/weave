"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Check, Sparkles, ChevronRight, X, Loader2 } from "lucide-react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { completeOnboarding } from "@/app/_services/user-onboarding";
import { cn } from "@/lib/utils";

export const OnboardingNavIndicator = () => {
  const { user, authenticated, refreshUser } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const completedSteps = user?.onboarding_state?.completed_steps ?? [];
  const hasProfile = completedSteps.includes("profile");
  const hasWorkspace = completedSteps.includes("workspace");
  const isFullyCompleted =
    user?.onboarding_state?.step === "COMPLETED" || completedSteps.includes("teams");

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleDismiss = useCallback(async () => {
    try {
      setIsDismissing(true);
      await completeOnboarding();
      await refreshUser();
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to dismiss onboarding prompt:", err);
    } finally {
      setIsDismissing(false);
    }
  }, [refreshUser]);

  // Only display if mandatory steps are completed but optional steps are still pending
  if (!authenticated || !user || !hasProfile || !hasWorkspace || isFullyCompleted) {
    return null;
  }

  const promptStrings = t?.navbar?.onboardingPrompt ?? {
    buttonLabel: "Configuração ({completed}/{total})",
    title: "Configuração do Workspace",
    description: "Complete as etapas para aproveitar ao máximo sua experiência.",
    stepCounter: "{completed} de {total} concluídas",
    stepProfile: "Perfil pessoal",
    stepWorkspace: "Configuração do workspace",
    stepTeams: "Times e membros",
    completedBadge: "Concluído",
    pendingBadge: "Pendente",
    actionComplete: "Completar etapas",
    actionDismiss: "Dispensar",
    dismissTooltip: "Marcar onboarding como concluído",
  };

  const completedCount = completedSteps.filter((s) => s === "profile" || s === "workspace").length;
  const totalCount = 3;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Navbar trigger badge */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "group relative flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-all duration-200",
          "border-amber-500/30 bg-amber-500/10 text-amber-800 hover:border-amber-500/50 hover:bg-amber-500/20",
          "dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/20",
          isOpen && "ring-2 ring-amber-500/30 dark:ring-amber-400/30"
        )}
        aria-label={promptStrings.buttonLabel
          .replace("{completed}", String(completedCount))
          .replace("{total}", String(totalCount))}
        title={promptStrings.buttonLabel
          .replace("{completed}", String(completedCount))
          .replace("{total}", String(totalCount))}
      >
        <Sparkles className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="hidden font-semibold sm:inline">
          {completedCount}/{totalCount}
        </span>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full right-0 z-50 mt-2 w-80 origin-top-right rounded-2xl border p-4 shadow-xl transition-all sm:w-88",
            "border-black/10 bg-white text-neutral-900",
            "dark:border-white/10 dark:bg-[#1d1d1b] dark:text-white"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-amber-500" />
                <h3 className="text-sm font-semibold tracking-tight">{promptStrings.title}</h3>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {promptStrings.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1 text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 py-2">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>
                {promptStrings.stepCounter
                  .replace("{completed}", String(completedCount))
                  .replace("{total}", String(totalCount))}
              </span>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                {progressPercent}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps Checklist */}
          <div className="space-y-2 py-2.5">
            {/* Step 1: Profile */}
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-2 py-1.5 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Check className="size-3" strokeWidth={2.5} />
                </div>
                <span className="text-xs text-neutral-600 line-through dark:text-neutral-400">
                  {promptStrings.stepProfile}
                </span>
              </div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {promptStrings.completedBadge}
              </span>
            </div>

            {/* Step 2: Workspace */}
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-2 py-1.5 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <Check className="size-3" strokeWidth={2.5} />
                </div>
                <span className="text-xs text-neutral-600 line-through dark:text-neutral-400">
                  {promptStrings.stepWorkspace}
                </span>
              </div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {promptStrings.completedBadge}
              </span>
            </div>

            {/* Step 3: Teams & Members */}
            <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 dark:bg-amber-400/5">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <Sparkles className="size-3" />
                </div>
                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  {promptStrings.stepTeams}
                </span>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                {promptStrings.pendingBadge}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 dark:border-white/5">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isDismissing}
              className="text-xs text-neutral-500 transition-colors hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-neutral-200"
              title={promptStrings.dismissTooltip}
            >
              {isDismissing ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  {promptStrings.actionDismiss}
                </span>
              ) : (
                promptStrings.actionDismiss
              )}
            </button>

            <Link
              href="/account/onboarding?step=3"
              onClick={() => setIsOpen(false)}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-xs transition-all",
                "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.98]",
                "dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              )}
            >
              {promptStrings.actionComplete}
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
