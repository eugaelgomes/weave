"use client";

import React from "react";
import { BaseHeader } from "@/app/(protected)/_components/ui/headers/base-header";
import { AnimatedGreeting } from "@/app/(protected)/_components/ui/headers/animated-greeting";

export function DocumentsHeader() {
  return <BaseHeader leftContent={<AnimatedGreeting type="documents" />} />;
}
