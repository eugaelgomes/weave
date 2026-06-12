"use client";

import React, { ReactNode } from "react";
import { BaseHeader } from "@/app/(protected)/_components/ui/headers/base-header";
import { AnimatedGreeting } from "@/app/(protected)/_components/ui/headers/animated-greeting";

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
