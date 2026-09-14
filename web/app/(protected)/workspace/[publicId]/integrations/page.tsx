"use client";

import { useLanguage } from "@/app/_contexts/language-context";
import { WorkspacePageShell } from "@/app/(protected)/workspace/_components/workspace-page-shell";
import { IntegrationsSettings } from "@/app/(protected)/_components/modals/settings/integrations-tab";

export default function WorkspaceIntegrationsPage() {
  const { t } = useLanguage();

  return (
    <WorkspacePageShell description={t.workspaceIntegrations.description}>
      <IntegrationsSettings />
    </WorkspacePageShell>
  );
}
