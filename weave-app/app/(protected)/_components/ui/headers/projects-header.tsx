"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

interface ProjectsHeaderProps {
  className?: string;
}

export function ProjectsHeader({ className }: ProjectsHeaderProps) {
  return (
    <BaseHeader
      className={className}
      leftContent={<AnimatedGreeting type="projects" />}
    />
  );
}
