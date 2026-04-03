"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../_contexts/auth-context";
import { AuthenticatedProviders } from "../_contexts/authenticated-providers";
import Layout from "./app_layout";

export const dynamicParams = true;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!loading && !authenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      const normalizedPath = pathname.replace(/\/+$/, "") || "/app";
      router.push(`/auth/?redirect=${encodeURIComponent(normalizedPath)}`);
    }
  }, [authenticated, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
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
