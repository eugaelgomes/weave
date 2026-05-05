"use client";

import React from "react";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

export function WorkspaceHeader() {
  return (
    <BaseHeader leftContent={<AnimatedGreeting type="workspace" />} />
  );
}
