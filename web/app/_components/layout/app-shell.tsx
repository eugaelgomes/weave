"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProtectedLayout from "@/app/_components/layout/protected-layout";
import { useAuth } from "@/app/_contexts/auth-context";
import { AuthenticatedProviders } from "@/app/_contexts/authenticated-providers";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && !authenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      // Normalize the pathname before storing it in redirect query param.
      const normalizedPath = pathname.replace(/\/+$/, "") || "/home";
      router.push(`/auth/?redirect=${encodeURIComponent(normalizedPath)}`);
    }
  }, [authenticated, loading, pathname, router]);

  if (loading || !authenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedProviders>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AuthenticatedProviders>
  );
}
