"use client";

import React from "react";
import ViewTypeIcon from "./view-type-icon";
import { VIEW_TYPE_OPTIONS, type ProjectViewType } from "./types";

interface ViewTypeSelectorProps {
  value: ProjectViewType;
  onChange: (value: ProjectViewType) => void;
  disabled?: boolean;
  className?: string;
  variant?: "select" | "buttons" | "tabs";
  showLabels?: boolean;
}

export default function ViewTypeSelector({
  value,
  onChange,
  disabled = false,
  className = "",
  variant = "select",
  showLabels = true,
}: ViewTypeSelectorProps) {
  // Variante: Select dropdown
  if (variant === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProjectViewType)}
        disabled={disabled}
        className={`w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2.5 dark:border-surface-dark-border-strong dark:bg-neutral-800 dark:text-neutral-100 ${className}`}
      >
        {VIEW_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  // Variante: Botões
  if (variant === "buttons") {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {VIEW_TYPE_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              title={option.description}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "bg-brand-primary-500/10 dark:bg-brand-primary-500/20 border-yellow-500 text-yellow-600 dark:border-yellow-500 dark:text-yellow-400"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50 dark:border-surface-dark-border-strong dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
              }`}
            >
              <ViewTypeIcon type={option.value} size="sm" />
              {showLabels && <span>{option.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // Variante: Tabs
  if (variant === "tabs") {
    return (
      <div
        className={`inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-1 dark:border-surface-dark-border-strong dark:bg-neutral-800 ${className}`}
      >
        {VIEW_TYPE_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              title={option.description}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              <ViewTypeIcon type={option.value} size="sm" />
              {showLabels && <span className="hidden sm:inline">{option.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}
