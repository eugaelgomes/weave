"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import { AuthenticatedProviders } from "../contexts/AuthenticatedProviders";
import Layout from "./components/layout/layout";

export const dynamicParams = true;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!loading && !authenticated && typeof window !== "undefined") {
      // Normaliza o pathname removendo barras finais
      const normalizedPath = pathname.replace(/\/+$/, "") || "/app";
      const redirectKey = `redirecting_to_signin_${normalizedPath}`;
      const isRedirecting = sessionStorage.getItem(redirectKey);
      
      if (!isRedirecting) {
        sessionStorage.setItem(redirectKey, 'true');
        router.push(`/auth/signin?redirect=${encodeURIComponent(normalizedPath)}`);
        // Limpa após navegação
        setTimeout(() => {
          sessionStorage.removeItem(redirectKey);
        }, 1000);
      }
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

  // Mostra loading enquanto redireciona para signin
  if (!authenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  // Renderiza com providers e layout apenas se autenticado
  return (
    <AuthenticatedProviders>
      <Layout>{children}</Layout>
    </AuthenticatedProviders>
  );
}
