"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "@/app/(protected)/_components/ui/headers/base-header";
import { AnimatedGreeting } from "@/app/(protected)/_components/ui/headers/animated-greeting";

interface NotificationsHeaderProps {
  className?: string;
}

export function NotificationsHeader({ className }: NotificationsHeaderProps) {
  return (
    <BaseHeader className={className} leftContent={<AnimatedGreeting type="notifications" />} />
  );
}
