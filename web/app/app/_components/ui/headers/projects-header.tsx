"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

interface ProjectsHeaderProps {
  className?: string;
}

export function ProjectsHeader({ className }: ProjectsHeaderProps) {
  const { t } = useLanguage();

  return <BaseHeader className={className} leftContent={t.nav.projects} />;
}
