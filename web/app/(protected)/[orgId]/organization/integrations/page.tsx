"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useOrganization } from "@/app/_contexts/organization-context";
import { WorkspacePageShell } from "@/app/(protected)/[orgId]/organization/_components/workspace-page-shell";
import { IntegrationsSection } from "@/app/(protected)/[orgId]/organization/_components/integrations-section";
import { DomainsSection } from "@/app/(protected)/[orgId]/organization/integrations/_components/domains-section";

export default function OrganizationIntegrationsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { organization, hasOrganization, isOwner } = useOrganization();

  const userIsOwner = user?.id ? isOwner(user.id) : false;

  if (!hasOrganization) {
    return (
      <WorkspacePageShell description={t.organizationIntegrations.description}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t.organizationGeneral.emptyBody}
        </p>
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell description={t.organizationIntegrations.description}>
      <div className="space-y-6">
        <IntegrationsSection organization={organization} />
        <DomainsSection userIsOwner={userIsOwner} />
      </div>
    </WorkspacePageShell>
  );
}
