"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

interface SettingsHeaderProps {
  className?: string;
}

export function SettingsHeader({ className }: SettingsHeaderProps) {
  return (
    <BaseHeader
      className={className}
      leftContent={<AnimatedGreeting type="settings" />}
    />
  );
}
