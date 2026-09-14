"use client";

import { useCallback, useMemo } from "react";
import { useAuth } from "./auth-context";
import { useWorkspace } from "./workspace-context";
import {
  WORKSPACE_PERMISSIONS,
  type WorkspacePermission,
  orgRoleHasPermission,
  normalizeWorkspaceRole,
} from "@/app/_utils/org-permissions";

export type { WorkspacePermission } from "@/app/_utils/org-permissions";
export { WORKSPACE_PERMISSIONS };

/**
 * Workspace permission checks aligned with weave-api `workspace-role-policy.js`.
 * Prefer `members`-based role when loaded; fall back to `user.workspace_member_role` from `/me`.
 */
export function useWorkspacePermissions() {
  const { user } = useAuth();
  const { getMemberRole, workspace } = useWorkspace();

  const resolvedRole = useMemo(() => {
    if (!user?.id) return null;
    const fromMembers = getMemberRole(user.id);
    if (fromMembers) return normalizeWorkspaceRole(fromMembers);
    const r = user.workspace_member_role;
    if (Array.isArray(r)) return normalizeWorkspaceRole(r[0] ?? null);
    return normalizeWorkspaceRole(r ?? null);
  }, [user?.id, user?.workspace_member_role, getMemberRole]);

  const can = useCallback(
    (permission: WorkspacePermission) => {
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
  const canManageWorkspaceLifecycle = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_WORKSPACE_LIFECYCLE), [can]);
  const canManageWeaveAi = useCallback(() => can(WORKSPACE_PERMISSIONS.MANAGE_WEAVE_AI), [can]);

  return {
    resolvedRole,
    isSuperAdminForCurrentUser,
    can,
    canManageMembers,
    canManageAreas,
    canManageBrand,
    canManageDomains,
    canManageWorkspaceLifecycle,
    canManageWeaveAi,
  };
}
