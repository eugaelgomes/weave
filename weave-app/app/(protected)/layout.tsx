"use client";

import AppShell from "@/app/_components/layout/app-shell";

export const dynamicParams = true;

export default function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
