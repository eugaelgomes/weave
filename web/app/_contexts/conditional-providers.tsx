"use client";

import React from "react";
import { useAuth } from "./auth-context";
import { AuthenticatedProviders } from "./authenticated-providers";

export function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();

  if (authenticated) {
    return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
  }

  return <>{children}</>;
}
