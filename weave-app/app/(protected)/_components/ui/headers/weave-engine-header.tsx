"use client";

import React from "react";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

interface WeaveEngineHeaderProps {
  className?: string;
}

export function WeaveEngineHeader({ className }: WeaveEngineHeaderProps) {
  return (
    <BaseHeader className={className} leftContent={<AnimatedGreeting type="weave-engine" />} />
  );
}
