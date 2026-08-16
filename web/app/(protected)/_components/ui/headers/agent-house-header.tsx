"use client";

import React, { ReactNode } from "react";
import { BaseHeader } from "@/app/(protected)/_components/ui/headers/base-header";
import { AnimatedGreeting } from "@/app/(protected)/_components/ui/headers/animated-greeting";

interface AgentHouseHeaderProps {
  className?: string;
  rightContent?: ReactNode;
}

export function AgentHouseHeader({ className, rightContent }: AgentHouseHeaderProps) {
  return (
    <BaseHeader
      className={className}
      leftContent={<AnimatedGreeting type="home" />}
      rightContent={rightContent}
    />
  );
}
