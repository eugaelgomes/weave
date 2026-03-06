"use client";

import React from "react";
import {
  LayoutGrid,
  List,
  Calendar,
  Clock,
  GanttChart,
} from "lucide-react";
import type { ProjectViewType } from "./types";

interface ViewTypeIconProps {
  type: ProjectViewType;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export default function ViewTypeIcon({
  type,
  className = "",
  size = "md",
}: ViewTypeIconProps) {
  const sizeClass = sizeClasses[size];
  const combinedClassName = `${sizeClass} ${className}`.trim();

  switch (type) {
    case "board":
      return <LayoutGrid className={combinedClassName} />;
    case "list":
      return <List className={combinedClassName} />;
    case "calendar":
      return <Calendar className={combinedClassName} />;
    case "timeline":
      return <Clock className={combinedClassName} />;
    case "gantt":
      return <GanttChart className={combinedClassName} />;
    default:
      return <LayoutGrid className={combinedClassName} />;
  }
}
