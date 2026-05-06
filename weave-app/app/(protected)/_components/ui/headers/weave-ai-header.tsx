"use client";

import React, { ReactNode } from "react";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

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
