"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useOrganization } from "@/app/_contexts/organization-context";
import { type OrganizationProperties } from "@/app/_services/organization";
import { WorkspacePageShell } from "@/app/(protected)/[orgId]/organization/_components/workspace-page-shell";
import { PlansUsageSection } from "@/app/(protected)/[orgId]/organization/_components/plans-usage-section";

export default function OrganizationPlansPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { organization, hasOrganization, getStats, isOwner } = useOrganization();
  const [localProps, setLocalProps] = useState<OrganizationProperties>({});

  useEffect(() => {
    if (!organization) return;
    setLocalProps(organization.properties || {});
  }, [organization]);

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;

  if (!hasOrganization) {
    return (
      <WorkspacePageShell description={t.organizationPlans.description}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t.organizationGeneral.emptyBody}
        </p>
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell description={t.organizationPlans.description}>
      <PlansUsageSection
        organization={organization}
        stats={stats}
        localProps={localProps}
        userIsOwner={userIsOwner}
      />
    </WorkspacePageShell>
  );
}
