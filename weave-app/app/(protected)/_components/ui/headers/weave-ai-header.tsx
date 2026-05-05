"use client";

import React, { ReactNode } from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";

interface WeaveAIHeaderProps {
  className?: string;
  rightContent?: ReactNode;
  titleSuffix?: ReactNode;
}

export function WeaveAIHeader({ className, rightContent }: WeaveAIHeaderProps) {
  return (
    <BaseHeader
      className={className}
      leftContent={<AnimatedGreeting type="weave-ai" />}
      rightContent={rightContent}
    />
  );
}
