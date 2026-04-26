"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

interface NotificationsHeaderProps {
  className?: string;
}

export function NotificationsHeader({ className }: NotificationsHeaderProps) {
  const { t } = useLanguage();

  return <BaseHeader className={className} leftContent={t.nav.notifications} />;
}
