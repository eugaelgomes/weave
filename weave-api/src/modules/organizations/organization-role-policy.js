/**
 * Motor central de permissões ao nível da organização.
 * Expandir PERMISSIONS_BY_ROLE quando novos papéis forem necessários.
 */

const ORG_ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  BILLING_MANAGER: "BILLING_MANAGER",
  MEMBER: "MEMBER",
  GUEST: "GUEST",
});

/** Permissões atómicas (ações sensíveis). */
const ORG_PERMISSIONS = Object.freeze({
  /** Ver/editar/gestão de qualquer projeto com org_id = organização ativa (admin / super_admin) */
  ACCESS_ALL_ORG_PROJECTS: "access_all_org_projects",
  /** Visualização de diretório de membros da organização */
  VIEW_MEMBER_DIRECTORY: "view_member_directory",
  /** Convidar/remover membros e alterar papéis */
  MANAGE_MEMBERS: "manage_members",
  /** Estrutura de áreas; super_admin (papel em DB), alinhado a gestores de área no controlador */
  MANAGE_AREAS: "manage_areas",
  /** Alterar plano / billing da organização (quando existir endpoint self-service) */
  MANAGE_BILLING_PLANS: "manage_billing_plans",
  /** Definir integrações globais da organização */
  MANAGE_GLOBAL_INTEGRATIONS: "manage_global_integrations",
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

/** Mapa papel → permissões. `super_admin` tudo; `admin` gestão diária; `billing_manager` só financeiro. */
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
  return PERMISSIONS_BY_ROLE[normalizedRole]
    ? [...PERMISSIONS_BY_ROLE[normalizedRole]]
    : [];
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
