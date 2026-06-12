"use client";

import React from "react";
import { BaseHeader } from "@/app/(protected)/_components/ui/headers/base-header";
import { AnimatedGreeting } from "@/app/(protected)/_components/ui/headers/animated-greeting";

interface WeaveEngineHeaderProps {
  className?: string;
}

export function WeaveEngineHeader({ className }: WeaveEngineHeaderProps) {
  return (
    <BaseHeader className={className} leftContent={<AnimatedGreeting type="weave-engine" />} />
  );
}
