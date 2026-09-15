"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { WorkspacePageShell } from "@/app/(protected)/settings/_components/workspace-page-shell";

export default function WorkspaceEditorPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <WorkspacePageShell description={t.workspaceEditor.description}>
      <div className="mx-auto w-full max-w-2xl">
        <div className="dark:border-surface-dark-border dark:shadow-surface-dark-sm rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:bg-[#1d1d1b]">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t.workspaceEditor.title.replace(
              "{name}",
              user?.workspace_name ?? t.workspaceEditor.fallbackWorkspaceName
            )}
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            {t.workspaceEditor.body}
          </p>
        </div>
      </div>
    </WorkspacePageShell>
  );
}
