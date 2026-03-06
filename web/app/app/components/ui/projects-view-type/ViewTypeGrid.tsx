"use client";

import React from "react";
import ViewTypeCard from "./ViewTypeCard";
import { VIEW_TYPE_OPTIONS, type ProjectViewType } from "./types";

interface ViewTypeGridProps {
  value: ProjectViewType;
  onChange: (value: ProjectViewType) => void;
  disabled?: boolean;
  className?: string;
  columns?: 2 | 3 | 5;
}

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

export default function ViewTypeGrid({
  value,
  onChange,
  disabled = false,
  className = "",
  columns = 5,
}: ViewTypeGridProps) {
  return (
    <div className={`grid gap-3 ${columnClasses[columns]} ${className}`}>
      {VIEW_TYPE_OPTIONS.map((option) => (
        <ViewTypeCard
          key={option.value}
          type={option.value}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
