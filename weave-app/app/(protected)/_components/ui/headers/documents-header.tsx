"use client";

import React from "react";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

export function DocumentsHeader() {
  return <BaseHeader leftContent={<AnimatedGreeting type="documents" />} />;
}
