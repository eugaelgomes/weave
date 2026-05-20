"use client";

import React, { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { ORG_PERMISSIONS, orgRoleHasPermission } from "@/app/_utils/org-permissions";
import { cn } from "@/lib/utils";
import {
  engineShellClass,
  engineTextLinkClass,
} from "@/app/(protected)/home/_components/engine-styles";

function buildBackHref(from: string | null): string {
  return from === "project" ? "/projects" : "/weave-engine";
}

export default function ComposeHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const copy = t.reasoningComposer.hub;
  const { user } = useAuth();

  const projectId = searchParams.get("projectId");
  const from = searchParams.get("from");
  const backHref = buildBackHref(from);

  const canManage = useMemo(() => {
    const role =
      typeof user?.org_member_role === "string"
        ? user.org_member_role
        : Array.isArray(user?.org_member_role)
          ? user?.org_member_role?.[0]
          : null;
    return orgRoleHasPermission(role, ORG_PERMISSIONS.MANAGE_PROJECTS);
  }, [user?.org_member_role]);

  useEffect(() => {
    if (!canManage) {
      toast.error(t.home.engine.forbidden);
      router.replace("/weave-engine");
    }
  }, [canManage, router, t.home.engine.forbidden]);

  const qs = new URLSearchParams();
  if (projectId) qs.set("projectId", projectId);
  if (from) qs.set("from", from);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-6 sm:px-4">
      <div>
        <Link href={backHref} className={engineTextLinkClass}>
          {copy.back}
        </Link>
        <h1 className="mt-2 text-lg font-medium text-neutral-900 dark:text-neutral-100">
          {copy.title}
        </h1>
        <p className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">{copy.subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href={`/weave-engine/compose/insight${suffix}`}
          className={cn(engineShellClass, "transition-colors hover:border-neutral-300 dark:hover:border-neutral-600")}
        >
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 text-neutral-500" aria-hidden />
            <div>
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {copy.insightTitle}
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                {copy.insightDescription}
              </p>
            </div>
          </div>
        </Link>

        <Link
          href={`/weave-engine/compose/instructions${suffix}`}
          className={cn(engineShellClass, "transition-colors hover:border-neutral-300 dark:hover:border-neutral-600")}
        >
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-neutral-500" aria-hidden />
            <div>
              <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {copy.instructionsTitle}
              </h2>
              <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                {copy.instructionsDescription}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
