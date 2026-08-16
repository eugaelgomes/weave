"use client";

import React from "react";
import ViewTypeIcon from "@/app/(protected)/_components/ui/projects/projects-view-type/view-type-icon";
import {
  getViewTypeOption,
  type ProjectViewType,
} from "@/app/(protected)/_components/ui/projects/projects-view-type/types";

interface ViewTypeBadgeProps {
  type: ProjectViewType;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs gap-1",
  md: "px-2.5 py-1 text-sm gap-1.5",
  lg: "px-3 py-1.5 text-sm gap-2",
};

export default function ViewTypeBadge({
  type,
  className = "",
  showLabel = true,
  size = "md",
}: ViewTypeBadgeProps) {
  const option = getViewTypeOption(type);
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`dark:border-surface-dark-border-strong inline-flex items-center rounded-md border border-neutral-200 bg-neutral-100 font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 ${sizeClass} ${className}`}
      title={option.description}
    >
      <ViewTypeIcon type={type} size={size === "lg" ? "md" : "sm"} />
      {showLabel && <span>{option.label}</span>}
    </span>
  );
}
