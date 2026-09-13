"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "./auth-context";
import { useOrganization } from "./workspace-context";
import {
  WORKSPACE_PERMISSIONS,
  type OrgPermission,
  orgRoleHasPermission,
  normalizeOrgRole,
} from "@/app/_utils/org-permissions";

export type { OrgPermission } from "@/app/_utils/org-permissions";
export { WORKSPACE_PERMISSIONS };

/**
 * Organization permission checks aligned with weave-api `workspace-role-policy.js`.
 * Prefer `members`-based role when loaded; fall back to `user.workspace_member_role` from `/me`.
 */
export function useOrgPermissions() {
  const { user } = useAuth();
  const { getMemberRole, workspace } = useOrganization();

  const resolvedRole = useMemo(() => {
    if (!user?.id) return null;
    const fromMembers = getMemberRole(user.id);
    if (fromMembers) return normalizeOrgRole(fromMembers);
    const r = user.workspace_member_role;
    if (Array.isArray(r)) return normalizeOrgRole(r[0] ?? null);
    return normalizeOrgRole(r ?? null);
  }, [user?.id, user?.workspace_member_role, getMemberRole]);

  const can = useCallback(
    (permission: OrgPermission) => {
      if (!resolvedRole) return false;
      return orgRoleHasPermission(resolvedRole, permission);
    },
    [resolvedRole]
  );

  const isSuperAdminForCurrentUser = useMemo(() => {
    if (!user?.id) return false;
    if (workspace?.user_id === user.id) return true;
    return resolvedRole === "SUPER_ADMIN";
  }, [workspace?.user_id, resolvedRole, user?.id]);

  const canManageMembers = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_MEMBERS), [can]);
  const canManageAreas = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_AREAS), [can]);
  const canManageBrand = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_BRAND), [can]);
  const canManageDomains = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_DOMAINS), [can]);
  const canManageOrgLifecycle = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_WORKSPACE_LIFECYCLE), [can]);
  const canManageWeaveAi = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_WEAVE_AI), [can]);

  return {
    resolvedRole,
    isSuperAdminForCurrentUser,
    can,
    canManageMembers,
    canManageAreas,
    canManageBrand,
    canManageDomains,
    canManageOrgLifecycle,
    canManageWeaveAi,
  };
}
