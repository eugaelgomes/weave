"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

interface SettingsHeaderProps {
  className?: string;
  type?: "settings" | "workspace" | "plans" | "security" | "integrations" | "preferences";
}

export function SettingsHeader({ className, type = "settings" }: SettingsHeaderProps) {
  return <BaseHeader className={className} leftContent={<AnimatedGreeting type={type} />} />;
}
