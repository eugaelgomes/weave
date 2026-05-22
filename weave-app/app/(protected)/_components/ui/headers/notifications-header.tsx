"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

interface NotificationsHeaderProps {
  className?: string;
}

export function NotificationsHeader({ className }: NotificationsHeaderProps) {
  return (
    <BaseHeader className={className} leftContent={<AnimatedGreeting type="notifications" />} />
  );
}
