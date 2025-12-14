"use client";

import React from "react";
import { useAuth } from "./AuthContext";
import { AuthenticatedProviders } from "./AuthenticatedProviders";

export function ConditionalProviders({ children }: { children: React.ReactNode }) {
  const { authenticated } = useAuth();

  if (authenticated) {
    return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
  }

  return <>{children}</>;
}
