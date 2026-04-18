"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

interface NotesHeaderProps {
  className?: string;
}

export function NotesHeader({ className }: NotesHeaderProps) {
  const { t } = useLanguage();

  return <BaseHeader className={className} leftContent={t.nav.notes} />;
}
