"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProtectedLayout from "@/app/_components/protected-layout";
import { useAuth } from "@/app/_contexts/auth-context";
import { AuthenticatedProviders } from "@/app/_contexts/authenticated-providers";
import GlobalLoading from "@/app/_components/ui/global-loading";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { authenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);
  const isOnboardingPath =
    pathname === "/account/onboarding" ||
    pathname.startsWith("/account/onboarding/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/");
  const onboardingComplete = user?.onboarding_state?.step === "COMPLETED";

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

  useEffect(() => {
    if (
      !loading &&
      authenticated &&
      user &&
      !onboardingComplete &&
      !isOnboardingPath &&
      !hasRedirected.current
    ) {
      hasRedirected.current = true;
      router.replace("/account/onboarding");
    }
  }, [authenticated, isOnboardingPath, loading, onboardingComplete, router, user]);

  if (loading || !authenticated || (authenticated && !onboardingComplete && !isOnboardingPath)) {
    return <GlobalLoading className="h-screen min-h-screen" />;
  }

  return (
    <AuthenticatedProviders>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AuthenticatedProviders>
  );
}
