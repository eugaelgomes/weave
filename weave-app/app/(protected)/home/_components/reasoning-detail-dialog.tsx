"use client";

import React from "react";
import { X } from "lucide-react";
import type { ReasoningContent } from "@/app/_services/projects-service/reasonings.schema";
import type { TranslationKeys } from "@/app/_i18n/locales/pt-BR";
import {
  engineModalOverlayClass,
  engineModalPanelClass,
  engineTextLinkClass,
  engineIconActionClass,
} from "@/app/(protected)/weave-engine/_components/engine-styles";
import { formatRelativeTime, getReasoningTypeLabel } from "@/app/(protected)/home/_components/engine-utils";
import { cn } from "@/lib/utils";

type EngineCopy = TranslationKeys["home"]["engine"];

export type ReasoningDetailDialogProps = {
  open: boolean;
  detail: ReasoningContent | undefined;
  projectName?: string;
  locale: string;
  copy: EngineCopy;
  onClose: () => void;
};

export function ReasoningDetailDialog({
  open,
  detail,
  projectName,
  locale,
  copy,
  onClose,
}: ReasoningDetailDialogProps) {
  if (!open) return null;

  const typeLabel = detail?.reasoning_type
    ? getReasoningTypeLabel(detail.reasoning_type, copy.reasoningTypes)
    : null;
  const when = formatRelativeTime(detail?.reasoning_created_at, locale);

  const metaParts = [projectName, typeLabel, when].filter(Boolean);

  return (
    <div className={engineModalOverlayClass} role="presentation" onClick={onClose}>
      <div
        className={cn(engineModalPanelClass, "max-w-2xl")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reasoning-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="reasoning-detail-title"
              className="text-base font-medium text-neutral-900 dark:text-neutral-100"
            >
              {detail?.title || copy.detailTitle}
            </h2>
            {metaParts.length > 0 && (
              <p className="mt-1 text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                {metaParts.join(" · ")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={engineIconActionClass}
            title={copy.close}
            aria-label={copy.close}
          >
            <X className="h-4 w-4 sm:opacity-100" />
          </button>
        </div>

        {!detail ? (
          <p className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
            {copy.loadingDetail}
          </p>
        ) : (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed font-normal text-neutral-800 dark:text-neutral-200 [&_pre]:bg-transparent [&_pre]:p-0"
          >
            <div className="whitespace-pre-wrap">
              {detail.output_markdown || copy.noContent}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className={engineTextLinkClass}>
            {copy.close}
          </button>
        </div>
      </div>
    </div>
  );
}
