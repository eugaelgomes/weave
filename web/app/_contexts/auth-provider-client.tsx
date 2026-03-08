"use client";

import React from "react";
import { ThemeProvider } from "./theme-context";
import { AuthProvider } from "./auth-context";

export default function AuthProviderClient({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
