"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

export function OrganizationHeader() {
  const { t } = useLanguage();

  return <BaseHeader leftContent={t.nav.organization} />;
}
