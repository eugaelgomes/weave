"use client";

import { AuthenticatedProviders } from "../contexts/AuthenticatedProviders";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
}
