"use client";

import React from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { WeaveEngineHeader } from "@/app/(protected)/_components/ui/headers";
import GlobalLoading from "@/app/_components/ui/global-loading";
import { WeaveEngineProvider } from "@/app/_contexts/weave-engine-context";

function WeaveEngineLayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-2 md:px-0">
      <WeaveEngineHeader />

      <main className="dark:shadow-surface-dark-sm md:dark:border-surface-dark-border flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-white md:rounded-md md:border md:border-neutral-200 md:shadow-sm dark:bg-[#1d1d1b]">
        <div className="custom-scrollbar flex-1 px-3 py-3 sm:px-4 sm:py-4">{children}</div>
      </main>
    </div>
  );
}

export default function WeaveEngineLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading: authLoading } = useAuth();

  if (authLoading) {
    return <GlobalLoading fullScreen={false} />;
  }

  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/";
    }
    return null;
  }

  return (
    <WeaveEngineProvider>
      <WeaveEngineLayoutContent>{children}</WeaveEngineLayoutContent>
    </WeaveEngineProvider>
  );
}
