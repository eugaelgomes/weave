"use client";

import React, { ReactNode } from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "@/app/(protected)/_components/ui/headers/base-header";
import { AnimatedGreeting } from "@/app/(protected)/_components/ui/headers/animated-greeting";

interface CalendarHeaderProps {
  rightContent?: ReactNode;
  className?: string;
}

export function CalendarHeader({ rightContent, className }: CalendarHeaderProps) {
  return (
    <BaseHeader
      className={className}
      leftContent={<AnimatedGreeting type="calendar" />}
      rightContent={rightContent}
    />
  );
}
