"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

interface SettingsHeaderProps {
  className?: string;
}

export function SettingsHeader({ className }: SettingsHeaderProps) {
  const { t } = useLanguage();

  return <BaseHeader className={className} leftContent={t.nav.settings} />;
}
