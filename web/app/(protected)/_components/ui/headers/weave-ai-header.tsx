"use client";

import React, { ReactNode } from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

interface WeaveAIHeaderProps {
  className?: string;
  rightContent?: ReactNode;
  titleSuffix?: ReactNode;
}

export function WeaveAIHeader({ className, rightContent, titleSuffix }: WeaveAIHeaderProps) {
  const { t } = useLanguage();

  return (
    <BaseHeader
      className={className}
      leftContent={
        <>
          {t.nav.weaveAi}
          {titleSuffix}
        </>
      }
      rightContent={rightContent}
    />
  );
}
