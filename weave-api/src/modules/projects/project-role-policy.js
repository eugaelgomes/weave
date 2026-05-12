/**
 * Motor central de permissões ao nível de projeto.
 * Mantém aliases legados para migração gradual sem quebrar dados existentes.
 */
const PROJECT_ROLES = Object.freeze({
  PROJECT_MANAGER: "PROJECT_MANAGER",
  CONTRIBUTOR: "CONTRIBUTOR",
  COMMENTER: "COMMENTER",
  VIEWER: "VIEWER",
});

const LEGACY_PROJECT_ROLE_ALIASES = Object.freeze({
  admin: PROJECT_ROLES.PROJECT_MANAGER,
  member: PROJECT_ROLES.CONTRIBUTOR,
  project_manager: PROJECT_ROLES.PROJECT_MANAGER,
  contributor: PROJECT_ROLES.CONTRIBUTOR,
  commenter: PROJECT_ROLES.COMMENTER,
  viewer: PROJECT_ROLES.VIEWER,
});

const PROJECT_PERMISSIONS = Object.freeze({
  READ_PROJECT_CONTENT: "read_project_content",
  COMMENT_PROJECT_CONTENT: "comment_project_content",
  WRITE_PROJECT_CONTENT: "write_project_content",
  MANAGE_PROJECT_MEMBERS: "manage_project_members",
  MANAGE_PROJECT_LIFECYCLE: "manage_project_lifecycle",
});

const PERMISSIONS_BY_PROJECT_ROLE = Object.freeze({
  [PROJECT_ROLES.PROJECT_MANAGER]: Object.values(PROJECT_PERMISSIONS),
  [PROJECT_ROLES.CONTRIBUTOR]: [
    PROJECT_PERMISSIONS.READ_PROJECT_CONTENT,
    PROJECT_PERMISSIONS.COMMENT_PROJECT_CONTENT,
    PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT,
  ],
  [PROJECT_ROLES.COMMENTER]: [
    PROJECT_PERMISSIONS.READ_PROJECT_CONTENT,
    PROJECT_PERMISSIONS.COMMENT_PROJECT_CONTENT,
  ],
  [PROJECT_ROLES.VIEWER]: [PROJECT_PERMISSIONS.READ_PROJECT_CONTENT],
});

const ASSIGNABLE_PROJECT_ROLES = Object.freeze([
  ...Object.values(PROJECT_ROLES),
  "project_manager",
  "contributor",
  "commenter",
  "viewer",
]);

/**
 * Roles allowed to pass `project_members.role` checks in SQL WHERE clauses.
 * Must use only values from DB type `project_member_role_enum` (not org roles like ADMIN/MEMBER).
 */
const PROJECT_WRITE_CAPABLE_ROLES = Object.freeze([
  PROJECT_ROLES.PROJECT_MANAGER,
  PROJECT_ROLES.CONTRIBUTOR,
]);

function normalizeProjectRole(role) {
  if (!role || typeof role !== "string") return null;
  const normalized = role.toUpperCase();
  return (
    LEGACY_PROJECT_ROLE_ALIASES[role] || PROJECT_ROLES[normalized] || normalized
  );
}

function getPermissionsForProjectRole(role) {
  const normalizedRole = normalizeProjectRole(role);
  if (!normalizedRole) return [];
  return PERMISSIONS_BY_PROJECT_ROLE[normalizedRole]
    ? [...PERMISSIONS_BY_PROJECT_ROLE[normalizedRole]]
    : [];
}

function projectRoleHasPermission(role, permission) {
  if (!permission) return false;
  return getPermissionsForProjectRole(role).includes(permission);
}

module.exports = {
  PROJECT_ROLES,
  PROJECT_PERMISSIONS,
  ASSIGNABLE_PROJECT_ROLES,
  PROJECT_WRITE_CAPABLE_ROLES,
  LEGACY_PROJECT_ROLE_ALIASES,
  normalizeProjectRole,
  getPermissionsForProjectRole,
  projectRoleHasPermission,
};
