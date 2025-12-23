"use client";

import { AuthenticatedProviders } from "../contexts/AuthenticatedProviders";

export const dynamicParams = true;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedProviders>{children}</AuthenticatedProviders>;
}
