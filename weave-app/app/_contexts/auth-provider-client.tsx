"use client";

import React from "react";
import { AuthProvider } from "./auth-context";

export default function AuthProviderClient({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
