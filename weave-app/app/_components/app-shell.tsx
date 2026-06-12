"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProtectedLayout from "@/app/_components/protected-layout";
import { useAuth } from "@/app/_contexts/auth-context";
import { AuthenticatedProviders } from "@/app/_contexts/authenticated-providers";
import GlobalLoading from "@/app/_components/ui/global-loading";
import { TaskNoteModal } from "@/app/(protected)/_components/task-note-modal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && !authenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      // Normalize the pathname before storing it in redirect query param.
      let normalizedPath = pathname.replace(/\/+$/, "");
      if (!normalizedPath || normalizedPath === "/") {
        normalizedPath = "";
      }
      router.push(`/auth/?redirect=${encodeURIComponent(normalizedPath)}`);
    }
  }, [authenticated, loading, pathname, router]);

  if (loading || !authenticated) {
    return <GlobalLoading className="h-screen min-h-screen" />;
  }

  return (
    <AuthenticatedProviders>
      <ProtectedLayout>{children}</ProtectedLayout>
      <TaskNoteModal />
    </AuthenticatedProviders>
  );
}
