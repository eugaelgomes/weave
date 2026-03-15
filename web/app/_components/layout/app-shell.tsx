"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Layout from "@/app/_components/layout/layout";
import AuthProviderClient from "@/app/_contexts/auth-provider-client";
import { useAuth } from "@/app/_contexts/auth-context";
import { AuthenticatedProviders } from "@/app/_contexts/authenticated-providers";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProviderClient>
      <AppShellContent>{children}</AppShellContent>
    </AuthProviderClient>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && !authenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      // Normalize the pathname before storing it in redirect query param.
      const normalizedPath = pathname.replace(/\/+$/, "") || "/app";
      router.push(`/auth/signin?redirect=${encodeURIComponent(normalizedPath)}`);
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
      <Layout>{children}</Layout>
    </AuthenticatedProviders>
  );
}
