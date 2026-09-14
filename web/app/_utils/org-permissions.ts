/**
 * Mirrors weave-api `src/modules/workspaces/workspace-role-policy.js` (WORKSPACE_PERMISSIONS + PERMISSIONS_BY_ROLE).
 * UI-only; the API remains authoritative.
 */

export const WORKSPACE_PERMISSIONS = Object.freeze({
  ACCESS_ALL_WORKSPACE_PROJECTS: "access_all_workspace_projects",
  VIEW_MEMBER_DIRECTORY: "view_member_directory",
  MANAGE_MEMBERS: "manage_members",
  MANAGE_AREAS: "manage_areas",
  MANAGE_BILLING_PLANS: "manage_billing_plans",
  MANAGE_GLOBAL_INTEGRATIONS: "manage_global_integrations",
  MANAGE_BRAND: "manage_brand",
  MANAGE_DOMAINS: "manage_domains",
  MANAGE_WORKSPACE_LIFECYCLE: "manage_workspace_lifecycle",
  MANAGE_PROJECTS: "manage_projects",
  MANAGE_TAGS: "manage_tags",
  MANAGE_TASK_PRIORITIES: "manage_task_priorities",
  MANAGE_WEAVE_AI: "manage_weave_ai",
} as const);

export type WorkspacePermission = (typeof WORKSPACE_PERMISSIONS)[keyof typeof WORKSPACE_PERMISSIONS];

const WORKSPACE_ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  BILLING_MANAGER: "BILLING_MANAGER",
  MEMBER: "MEMBER",
  GUEST: "GUEST",
} as const);

const PERMISSIONS_BY_ROLE: Readonly<Record<string, readonly WorkspacePermission[]>> = Object.freeze({
  [WORKSPACE_ROLES.SUPER_ADMIN]: Object.values(WORKSPACE_PERMISSIONS),
  [WORKSPACE_ROLES.ADMIN]: [
    WORKSPACE_PERMISSIONS.ACCESS_ALL_WORKSPACE_PROJECTS,
    WORKSPACE_PERMISSIONS.VIEW_MEMBER_DIRECTORY,
    WORKSPACE_PERMISSIONS.MANAGE_MEMBERS,
    WORKSPACE_PERMISSIONS.MANAGE_AREAS,
    WORKSPACE_PERMISSIONS.MANAGE_WORKSPACE_LIFECYCLE,
    WORKSPACE_PERMISSIONS.MANAGE_GLOBAL_INTEGRATIONS,
    WORKSPACE_PERMISSIONS.MANAGE_BRAND,
    WORKSPACE_PERMISSIONS.MANAGE_DOMAINS,
    WORKSPACE_PERMISSIONS.MANAGE_PROJECTS,
    WORKSPACE_PERMISSIONS.MANAGE_TAGS,
    WORKSPACE_PERMISSIONS.MANAGE_TASK_PRIORITIES,
    WORKSPACE_PERMISSIONS.MANAGE_WEAVE_AI,
  ],
  [WORKSPACE_ROLES.BILLING_MANAGER]: [WORKSPACE_PERMISSIONS.MANAGE_BILLING_PLANS],
  [WORKSPACE_ROLES.MEMBER]: [
    WORKSPACE_PERMISSIONS.VIEW_MEMBER_DIRECTORY,
    WORKSPACE_PERMISSIONS.MANAGE_PROJECTS,
    WORKSPACE_PERMISSIONS.MANAGE_TAGS,
    WORKSPACE_PERMISSIONS.MANAGE_TASK_PRIORITIES,
  ],
  [WORKSPACE_ROLES.GUEST]: [],
});

export function normalizeWorkspaceRole(role: string | null | undefined): string | null {
  if (!role || typeof role !== "string") return null;
  return role.toUpperCase();
}

export function getPermissionsForRole(role: string | null | undefined): WorkspacePermission[] {
  const normalized = normalizeWorkspaceRole(role);
  if (!normalized) return [];
  const list = PERMISSIONS_BY_ROLE[normalized];
  return list ? [...list] : [];
}

export function orgRoleHasPermission(
  role: string | null | undefined,
  permission: WorkspacePermission
): boolean {
  return getPermissionsForRole(role).includes(permission);
}
