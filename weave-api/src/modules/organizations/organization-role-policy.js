/**
 * Motor central de permissões ao nível da organização.
 * Expandir PERMISSIONS_BY_ROLE quando novos papéis forem necessários.
 */

const ORG_ROLES = Object.freeze({
  ADMIN: "ADMIN",
  BILLING_MANAGER: "BILLING_MANAGER",
  GUEST: "GUEST",
  MEMBER: "MEMBER",
  SUPER_ADMIN: "SUPER_ADMIN",
});

/** Atomic permissions (sensitive actions). */
const ORG_PERMISSIONS = Object.freeze({
  /** View/edit/manage any project with org_id = active organization (admin / super_admin) */
  ACCESS_ALL_ORG_PROJECTS: "access_all_org_projects",

  /** Area structure; super_admin (DB role), aligned with area managers in controller */
  MANAGE_AREAS: "manage_areas",

  /** Change organization plan / billing (when self-service endpoint exists) */
  MANAGE_BILLING_PLANS: "manage_billing_plans",

  /** Logo, banner, name, description, unique_name, properties/branding */
  MANAGE_BRAND: "manage_brand",

  /** Custom domains, DNS verification, SSO */
  MANAGE_DOMAINS: "manage_domains",

  /** Define global organization integrations */
  MANAGE_GLOBAL_INTEGRATIONS: "manage_global_integrations",

  /** Invite/remove members and change roles */
  MANAGE_MEMBERS: "manage_members",

  /** Terminate / restore the organization (org account) */
  MANAGE_ORG_LIFECYCLE: "manage_org_lifecycle",

  /** Project CRUD, project collaborators, associated notes */
  MANAGE_PROJECTS: "manage_projects",

  /** Project or organization level tags */
  MANAGE_TAGS: "manage_tags",

  /** Task priorities (project or organization) */
  MANAGE_TASK_PRIORITIES: "manage_task_priorities",

  /** Weave AI agents, sharing, knowledge (excludes chat consumption) */
  MANAGE_WEAVE_AI: "manage_weave_ai",

  /** View organization members directory */
  VIEW_MEMBER_DIRECTORY: "view_member_directory",
});

/** Map role → permissions. `super_admin` everything; `admin` daily management; `billing_manager` financial only. */
const PERMISSIONS_BY_ROLE = Object.freeze({
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

/**
 * @param {string|null|undefined} role
 * @returns {string[]}
 */
function getPermissionsForRole(role) {
  if (!role || typeof role !== "string") return [];
  const normalizedRole = role.toUpperCase();
  return PERMISSIONS_BY_ROLE[normalizedRole] ? [...PERMISSIONS_BY_ROLE[normalizedRole]] : [];
}

/**
 * @param {string|null|undefined} role
 * @param {string} permission — use ORG_PERMISSIONS.*
 * @returns {boolean}
 */
function orgRoleHasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}

module.exports = {
  getPermissionsForRole,
  ORG_PERMISSIONS,
  ORG_ROLES,
  orgRoleHasPermission,
  PERMISSIONS_BY_ROLE,
};
