"use client";

import React from "react";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

export type WorkspaceHeaderType =
  | "workspace"
  | "workspaceSettings"
  | "workspaceMembers"
  | "workspaceInvites"
  | "workspaceAreas"
  | "workspaceProjects"
  | "workspacePlans"
  | "workspaceIntegrations"
  | "workspaceEditor";

interface WorkspaceHeaderProps {
  className?: string;
  type?: WorkspaceHeaderType;
}

export function WorkspaceHeader({ className, type = "workspace" }: WorkspaceHeaderProps) {
  return <BaseHeader className={className} leftContent={<AnimatedGreeting type={type} />} />;
}
