/**
 * Mirrors weave-api `src/modules/organizations/organization-role-policy.js` (ORG_PERMISSIONS + PERMISSIONS_BY_ROLE).
 * UI-only; the API remains authoritative.
 */

export const ORG_PERMISSIONS = Object.freeze({
  ACCESS_ALL_ORG_PROJECTS: "access_all_org_projects",
  VIEW_MEMBER_DIRECTORY: "view_member_directory",
  MANAGE_MEMBERS: "manage_members",
  MANAGE_AREAS: "manage_areas",
  MANAGE_BILLING_PLANS: "manage_billing_plans",
  MANAGE_GLOBAL_INTEGRATIONS: "manage_global_integrations",
  MANAGE_BRAND: "manage_brand",
  MANAGE_DOMAINS: "manage_domains",
  MANAGE_ORG_LIFECYCLE: "manage_org_lifecycle",
  MANAGE_PROJECTS: "manage_projects",
  MANAGE_TAGS: "manage_tags",
  MANAGE_TASK_PRIORITIES: "manage_task_priorities",
  MANAGE_WEAVE_AI: "manage_weave_ai",
} as const);

export type OrgPermission = (typeof ORG_PERMISSIONS)[keyof typeof ORG_PERMISSIONS];

const ORG_ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  BILLING_MANAGER: "BILLING_MANAGER",
  MEMBER: "MEMBER",
  GUEST: "GUEST",
} as const);

const PERMISSIONS_BY_ROLE: Readonly<Record<string, readonly OrgPermission[]>> = Object.freeze({
  [ORG_ROLES.SUPER_ADMIN]: Object.values(ORG_PERMISSIONS),
  [ORG_ROLES.ADMIN]: [
    ORG_PERMISSIONS.ACCESS_ALL_ORG_PROJECTS,
    ORG_PERMISSIONS.VIEW_MEMBER_DIRECTORY,
    ORG_PERMISSIONS.MANAGE_MEMBERS,
    ORG_PERMISSIONS.MANAGE_AREAS,
    ORG_PERMISSIONS.MANAGE_ORG_LIFECYCLE,
    ORG_PERMISSIONS.MANAGE_GLOBAL_INTEGRATIONS,
    ORG_PERMISSIONS.MANAGE_BRAND,
    ORG_PERMISSIONS.MANAGE_DOMAINS,
    ORG_PERMISSIONS.MANAGE_PROJECTS,
    ORG_PERMISSIONS.MANAGE_TAGS,
    ORG_PERMISSIONS.MANAGE_TASK_PRIORITIES,
    ORG_PERMISSIONS.MANAGE_WEAVE_AI,
  ],
  [ORG_ROLES.BILLING_MANAGER]: [ORG_PERMISSIONS.MANAGE_BILLING_PLANS],
  [ORG_ROLES.MEMBER]: [
    ORG_PERMISSIONS.VIEW_MEMBER_DIRECTORY,
    ORG_PERMISSIONS.MANAGE_PROJECTS,
    ORG_PERMISSIONS.MANAGE_TAGS,
    ORG_PERMISSIONS.MANAGE_TASK_PRIORITIES,
  ],
  [ORG_ROLES.GUEST]: [],
});

export function normalizeOrgRole(role: string | null | undefined): string | null {
  if (!role || typeof role !== "string") return null;
  return role.toUpperCase();
}

export function getPermissionsForRole(role: string | null | undefined): OrgPermission[] {
  const normalized = normalizeOrgRole(role);
  if (!normalized) return [];
  const list = PERMISSIONS_BY_ROLE[normalized];
  return list ? [...list] : [];
}

export function orgRoleHasPermission(
  role: string | null | undefined,
  permission: OrgPermission
): boolean {
  return getPermissionsForRole(role).includes(permission);
}
