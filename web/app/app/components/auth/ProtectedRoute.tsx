"use client";

import { useAuth } from "../../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  fallback,
  redirectTo = "/auth/signin",
}: ProtectedRouteProps) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push(redirectTo);
    }
  }, [authenticated, loading, router, redirectTo]);

  if (loading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )
    );
  }

  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
}
