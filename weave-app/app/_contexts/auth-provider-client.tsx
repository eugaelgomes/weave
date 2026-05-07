"use client";

import React from "react";
import { AuthProvider } from "./auth-context";
import { PlanUsageProvider } from "./plan-usage-context";

export default function AuthProviderClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlanUsageProvider>{children}</PlanUsageProvider>
    </AuthProvider>
  );
}
