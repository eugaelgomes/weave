"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { useOrganization } from "@/app/_contexts/workspace-context";
import { type OrganizationProperties } from "@/app/_services/workspace";
import { WorkspacePageShell } from "@/app/(protected)/organization/_components/workspace-page-shell";
import { PlansUsageSection } from "@/app/(protected)/organization/_components/plans-usage-section";

export default function OrganizationPlansPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { workspace, hasOrganization, getStats, isOwner } = useOrganization();
  const [localProps, setLocalProps] = useState<OrganizationProperties>({});

  useEffect(() => {
    if (!workspace) return;
    setLocalProps(workspace.properties || {});
  }, [workspace]);

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;

  if (!hasOrganization) {
    return (
      <WorkspacePageShell description={t.workspacePlans.description}>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t.workspaceGeneral.emptyBody}
        </p>
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell description={t.workspacePlans.description}>
      <PlansUsageSection
        workspace={workspace}
        stats={stats}
        localProps={localProps}
        userIsOwner={userIsOwner}
      />
    </WorkspacePageShell>
  );
}
