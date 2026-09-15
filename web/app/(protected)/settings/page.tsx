"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const { loading, user } = useAuth();
  const workspacePublicId = user?.user_workspace?.public_id || user?.workspace_public_id;

  useEffect(() => {
    if (loading || !workspacePublicId) return;

    router.replace(`/workspace/${encodeURIComponent(workspacePublicId)}/dashboard`);
  }, [loading, router, workspacePublicId]);

  return null;
}
