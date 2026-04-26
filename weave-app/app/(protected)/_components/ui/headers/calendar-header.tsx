"use client";

import React, { ReactNode } from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

interface CalendarHeaderProps {
  rightContent?: ReactNode;
  className?: string;
}

export function CalendarHeader({ rightContent, className }: CalendarHeaderProps) {
  const { t } = useLanguage();

  return (
    <BaseHeader className={className} leftContent={t.nav.calendar} rightContent={rightContent} />
  );
}
