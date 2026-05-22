"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { ComposeChipId } from "@/app/(protected)/weave-engine/compose/_utils/compose-utils";

export type ComposeOptionChipsProps = {
  chips: ComposeChipId[];
  labels: Record<ComposeChipId, string>;
  onSelect: (chip: ComposeChipId) => void;
  disabled?: boolean;
};

export function ComposeOptionChips({ chips, labels, onSelect, disabled }: ComposeOptionChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(chip)}
          className={cn(
            "rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-normal text-neutral-700 transition-colors",
            "dark:border-surface-dark-border hover:border-neutral-300 hover:bg-white dark:bg-neutral-900/40 dark:text-neutral-200 dark:hover:bg-neutral-800",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {labels[chip] ?? chip}
        </button>
      ))}
    </div>
  );
}
