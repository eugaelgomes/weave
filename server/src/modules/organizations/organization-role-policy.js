/**
 * Motor central de permissões ao nível da organização.
 * Expandir PERMISSIONS_BY_ROLE quando novos papéis forem necessários.
 */

const ORG_ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MEMBER: "member",
  GUEST: "guest",
});

/** Permissões atómicas (ações sensíveis). */
const ORG_PERMISSIONS = Object.freeze({
  /** Estrutura de áreas; super_admin (papel em DB), alinhado a gestores de área no controlador */
  MANAGE_AREAS: "manage_areas",
  /** Alterar plano / billing da organização (quando existir endpoint self-service) */
  MANAGE_BILLING_PLANS: "manage_billing_plans",
  /** Logo, banner, nome, descrição, unique_name, propriedades/branding */
  MANAGE_BRAND: "manage_brand",
  /** Domínios customizados, verificação DNS, SSO */
  MANAGE_DOMAINS: "manage_domains",
  /** Encerrar / restaurar a organização (conta org) */
  MANAGE_ORG_LIFECYCLE: "manage_org_lifecycle",
  /** CRUD de projetos, colaboradores em projeto, notas associadas */
  MANAGE_PROJECTS: "manage_projects",
  /** Tags ao nível de projeto ou organização */
  MANAGE_TAGS: "manage_tags",
  /** Prioridades de tarefas (projeto ou organização) */
  MANAGE_TASK_PRIORITIES: "manage_task_priorities",
  /** Agentes Weave AI, partilha, conhecimento (não inclui consumo de chat) */
  MANAGE_WEAVE_AI: "manage_weave_ai",
});

/** Mapa papel → permissões. `super_admin` tudo; `admin` + áreas + Weave AI; `member` só projetos/tags/prioridades. */
const PERMISSIONS_BY_ROLE = Object.freeze({
  [ORG_ROLES.SUPER_ADMIN]: Object.values(ORG_PERMISSIONS),
  [ORG_ROLES.ADMIN]: [
    ORG_PERMISSIONS.MANAGE_AREAS,
    ORG_PERMISSIONS.MANAGE_PROJECTS,
    ORG_PERMISSIONS.MANAGE_TAGS,
    ORG_PERMISSIONS.MANAGE_TASK_PRIORITIES,
    ORG_PERMISSIONS.MANAGE_WEAVE_AI,
  ],
  [ORG_ROLES.MEMBER]: [
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
  return PERMISSIONS_BY_ROLE[role] ? [...PERMISSIONS_BY_ROLE[role]] : [];
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
  ORG_ROLES,
  ORG_PERMISSIONS,
  PERMISSIONS_BY_ROLE,
  getPermissionsForRole,
  orgRoleHasPermission,
};
