"use client";

import { useLanguage } from "@/app/_contexts/language-context";
import { normalizeWorkspaceRoleForUi, type WorkspaceRoleUiKey } from "@/app/_services/workspace";

type Props = { role: string };

export function MemberWorkspaceRoleBadge({ role }: Props) {
  const { t } = useLanguage();
  const key = normalizeWorkspaceRoleForUi(role);
  const styles: Record<WorkspaceRoleUiKey, string> = {
    super_admin:
      "bg-brand-primary-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
    admin: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
    billing_manager: "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300",
    member: "bg-neutral-500/10 text-neutral-700 border-neutral-500/20 dark:text-neutral-300",
    guest:
      "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800/50 dark:border-surface-dark-border",
  };
  const labels: Record<WorkspaceRoleUiKey, string> = {
    super_admin: t.workspaceMembers.superAdmin,
    admin: t.workspaceMembers.adminRole,
    billing_manager: t.workspaceMembers.billingManager,
    member: t.workspaceMembers.member,
    guest: t.workspaceMembers.guest,
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${styles[key]}`}
    >
      {labels[key]}
    </span>
  );
}
