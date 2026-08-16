"use client";

import AppShell from "@/app/_components/app-shell";

export const dynamicParams = true;

export default function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
