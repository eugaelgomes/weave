"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { WorkspacePageShell } from "@/app/(protected)/organization/_components/workspace-page-shell";

export default function OrganizationEditorPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <WorkspacePageShell description={t.organizationEditor.description}>
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t.organizationEditor.title.replace(
              "{name}",
              user?.org_name ?? t.organizationEditor.fallbackOrgName,
            )}
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {t.organizationEditor.body}
          </p>
        </div>
      </div>
    </WorkspacePageShell>
  );
}
