"use client";

import React from "react";
import ViewTypeIcon from "./view-type-icon";
import { getViewTypeOption, type ProjectViewType } from "./types";

interface ViewTypeCardProps {
  type: ProjectViewType;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function ViewTypeCard({
  type,
  selected = false,
  onClick,
  disabled = false,
  className = "",
}: ViewTypeCardProps) {
  const option = getViewTypeOption(type);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "bg-brand-primary-500/10 dark:bg-brand-primary-500/20 border-yellow-500 ring-2 ring-yellow-500/20 dark:border-yellow-500"
          : "dark:border-surface-dark-border-strong border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
      } ${className}`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-lg ${
          selected
            ? "bg-brand-primary-500/20 text-yellow-600 dark:text-yellow-400"
            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
        }`}
      >
        <ViewTypeIcon type={type} size="lg" />
      </div>
      <div>
        <p
          className={`font-semibold ${
            selected
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-neutral-900 dark:text-neutral-100"
          }`}
        >
          {option.label}
        </p>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {option.description}
        </p>
      </div>
    </button>
  );
}
