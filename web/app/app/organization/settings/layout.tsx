"use client";

import React from "react";
import { OrganizationHeader } from "@/app/app/_components/ui/headers/organization-header";

export default function OrganizationSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col space-y-2">
      <OrganizationHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
