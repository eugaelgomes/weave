/**
 * Mirrors weave-api `WORKSPACE_ROLES` / `validRoles` and invite `PROJECT_MEMBER_ROLES`
 * (see members.controller.js, workspace-role-policy.js).
 */

export const WORKSPACE_WORKSPACE_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "BILLING_MANAGER",
  "MEMBER",
  "GUEST",
] as const;

export type OrgWorkspaceRole = (typeof WORKSPACE_WORKSPACE_ROLES)[number];

export const PROJECT_MEMBER_ROLES = [
  "PROJECT_MANAGER",
  "CONTRIBUTOR",
  "COMMENTER",
  "VIEWER",
] as const;

export type ProjectMemberRoleForInvite = (typeof PROJECT_MEMBER_ROLES)[number];

/** Lowercase keys for Tailwind / translation maps (Badge). */
export type OrgRoleUiKey = "super_admin" | "admin" | "billing_manager" | "member" | "guest";

/**
 * Normalizes API workspace role (typically UPPERCASE) to a stable UI key.
 * Unknown values fall back to `member`.
 */
export function normalizeOrgRoleForUi(role: string | null | undefined): OrgRoleUiKey {
  const u = (role ?? "").trim().toUpperCase();
  if (u === "SUPER_ADMIN") return "super_admin";
  if (u === "ADMIN") return "admin";
  if (u === "BILLING_MANAGER") return "billing_manager";
  if (u === "MEMBER") return "member";
  if (u === "GUEST") return "guest";
  return "member";
}

export function isOrgWorkspaceRole(value: string): value is OrgWorkspaceRole {
  return (WORKSPACE_WORKSPACE_ROLES as readonly string[]).includes(value);
}

export function isProjectMemberRoleForInvite(value: string): value is ProjectMemberRoleForInvite {
  return (PROJECT_MEMBER_ROLES as readonly string[]).includes(value);
}
