"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { routes } from "@/app/_utils/routes";
import GlobalLoading from "@/app/_components/ui/global-loading";

export default function OrgRootPage() {
  const router = useRouter();
  const params = useParams();
  const { user, authenticated, loading } = useAuth();
  const orgIdFromUrl = params?.orgId as string;

  useEffect(() => {
    if (loading) return;

    if (!authenticated || !user) {
      router.replace(routes.auth.signIn());
      return;
    }

    const correctOrgId = user.org_public_id || user.public_id;

    if (!correctOrgId) {
      router.replace(routes.auth.signIn());
      return;
    }

    // Redireciona sempre para a home do org correto,
    // independentemente de ser um erro de rota (/home)
    // ou apenas um acesso direto a raiz (/1234)
    router.replace(routes.home(correctOrgId));
  }, [loading, authenticated, user, router, orgIdFromUrl]);

  return <GlobalLoading fullScreen={true} />;
}
