"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Check, Circle, ChevronRight, X, Loader2 } from "lucide-react";
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
    description: "Complete as etapas opcionais para organizar sua equipe.",
    stepCounter: "{completed} de {total} concluídas",
    stepProfile: "Perfil pessoal",
    stepWorkspace: "Configuração do workspace",
    stepTeams: "Times e membros",
    completedBadge: "Concluído",
    pendingBadge: "Opcional",
    actionComplete: "Completar",
    actionDismiss: "Dispensar",
    dismissTooltip: "Marcar onboarding como concluído",
  };

  const completedCount = completedSteps.filter((s) => s === "profile" || s === "workspace").length;
  const totalCount = 3;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const strokeRadius = 7;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = strokeCircumference * (1 - completedCount / totalCount);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Clean Navbar trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex h-6 items-center gap-1.5 rounded-md px-1.5 text-xs font-medium transition-colors",
          "text-neutral-600 hover:bg-black/5 hover:text-black",
          "dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white",
          isOpen && "bg-black/5 text-black dark:bg-white/10 dark:text-white"
        )}
        aria-label={promptStrings.buttonLabel
          .replace("{completed}", String(completedCount))
          .replace("{total}", String(totalCount))}
        title={promptStrings.buttonLabel
          .replace("{completed}", String(completedCount))
          .replace("{total}", String(totalCount))}
      >
        <svg className="size-3.5 shrink-0 -rotate-90" viewBox="0 0 18 18" fill="none">
          <circle
            cx="9"
            cy="9"
            r={strokeRadius}
            className="stroke-neutral-300 dark:stroke-neutral-700"
            strokeWidth="2"
          />
          <circle
            cx="9"
            cy="9"
            r={strokeRadius}
            className="stroke-neutral-900 transition-all duration-300 dark:stroke-white"
            strokeWidth="2"
            strokeDasharray={strokeCircumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[11px] leading-none font-medium">
          {completedCount}/{totalCount}
        </span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full right-0 z-50 mt-2 w-72 origin-top-right rounded-xl border p-3 shadow-lg transition-all",
            "border-black/10 bg-white text-neutral-900",
            "dark:border-white/10 dark:bg-[#1d1d1b] dark:text-white"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5">
            <div>
              <h3 className="text-xs font-semibold tracking-tight text-neutral-900 dark:text-white">
                {promptStrings.title}
              </h3>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {promptStrings.stepCounter
                  .replace("{completed}", String(completedCount))
                  .replace("{total}", String(totalCount))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-200"
              aria-label="Close"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="py-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-neutral-900 transition-all duration-300 dark:bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps Checklist */}
          <div className="space-y-1.5 py-2">
            {/* Step 1: Profile */}
            <div className="flex items-center justify-between rounded-md px-2 py-1 text-neutral-400 dark:text-neutral-500">
              <div className="flex items-center gap-2">
                <Check className="size-3.5 stroke-[2.5]" />
                <span className="text-xs line-through">{promptStrings.stepProfile}</span>
              </div>
              <span className="text-[10px]">{promptStrings.completedBadge}</span>
            </div>

            {/* Step 2: Workspace */}
            <div className="flex items-center justify-between rounded-md px-2 py-1 text-neutral-400 dark:text-neutral-500">
              <div className="flex items-center gap-2">
                <Check className="size-3.5 stroke-[2.5]" />
                <span className="text-xs line-through">{promptStrings.stepWorkspace}</span>
              </div>
              <span className="text-[10px]">{promptStrings.completedBadge}</span>
            </div>

            {/* Step 3: Teams & Members */}
            <div className="flex items-center justify-between rounded-md bg-black/5 px-2 py-1 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <Circle className="size-3.5 stroke-[2] text-neutral-700 dark:text-neutral-300" />
                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                  {promptStrings.stepTeams}
                </span>
              </div>
              <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                {promptStrings.pendingBadge}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 dark:border-white/5">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isDismissing}
              className="text-[11px] text-neutral-400 transition-colors hover:text-neutral-700 disabled:opacity-50 dark:text-neutral-500 dark:hover:text-neutral-200"
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
                "inline-flex h-6 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors",
                "bg-neutral-900 text-white hover:bg-neutral-800",
                "dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
              )}
            >
              {promptStrings.actionComplete}
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
