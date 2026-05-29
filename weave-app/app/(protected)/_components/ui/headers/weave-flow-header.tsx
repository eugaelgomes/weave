"use client";

import React, { ReactNode } from "react";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

interface WeaveFlowHeaderProps {
  className?: string;
  rightContent?: ReactNode;
}

export function WeaveFlowHeader({ className, rightContent }: WeaveFlowHeaderProps) {
  return (
    <BaseHeader
      className={className}
      leftContent={<AnimatedGreeting type="weave-flow" />}
      rightContent={rightContent}
    />
  );
}
