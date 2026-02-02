"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { AuthenticatedProviders } from "../contexts/AuthenticatedProviders";
import Layout from "./components/layout/layout";

export const dynamicParams = true;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Evita múltiplos redirecionamentos
    if (!loading && !authenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      // Normaliza o pathname removendo barras finais para evitar loops
      const normalizedPath = pathname.replace(/\/+$/, "") || "/app";
      router.replace(`/auth/signin?redirect=${encodeURIComponent(normalizedPath)}`);
    }
  }, [authenticated, loading, router, pathname]);

  // Aguarda verificação de autenticação
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  // Redireciona se não autenticado
  if (!authenticated) {
    return null;
  }

  // Renderiza com providers e layout apenas se autenticado
  return (
    <AuthenticatedProviders>
      <Layout>{children}</Layout>
    </AuthenticatedProviders>
  );
}
