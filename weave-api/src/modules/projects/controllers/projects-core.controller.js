const ProjectsRepository = require("@/modules/projects/repositories/projects.repository");
const ProjectsBaseController = require("@/modules/projects/controllers/base.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const {
  orgRoleHasPermission,
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");
const {
  projectRoleHasPermission,
  PROJECT_PERMISSIONS,
} = require("@/modules/projects/project-role-policy");

class ProjectsCoreController extends ProjectsBaseController {
  constructor() {
    super();
    this.projectsRepository = ProjectsRepository;
  }

  /**
   * Valida e sanitiza properties do projeto
   * @param {Object} properties - Properties a serem validadas
   * @returns {Object} - Properties validadas
   * @throws {Error} - Se houver valores inválidos
   */
  _validateProperties(properties) {
    if (!properties || typeof properties !== "object") {
      return {};
    }

    const allowedProps = [
      "priority",
      "tags",
      "estimated_time",
      "complexity",
      "color",
      "icon",
    ];
    const validPriorities = ["alta", "media", "baixa"];
    const validComplexities = ["alta", "media", "baixa"];

    const validated = {};

    // Validar cada propriedade
    for (const [key, value] of Object.entries(properties)) {
      // Ignorar progress - será calculado automaticamente
      if (key === "progress") {
        continue;
      }

      // Aceitar apenas propriedades permitidas
      if (!allowedProps.includes(key)) {
        throw new Error(`Propriedade '${key}' não é permitida`);
      }

      // Validar priority
      if (key === "priority") {
        if (value !== null && !validPriorities.includes(value)) {
          throw new Error("Priority deve ser: 'alta', 'media' ou 'baixa'");
        }
        validated[key] = value;
      }

      // Validar complexity
      else if (key === "complexity") {
        if (value !== null && !validComplexities.includes(value)) {
          throw new Error("Complexity deve ser: 'alta', 'media' ou 'baixa'");
        }
        validated[key] = value;
      }

      // Validar tags (deve ser array)
      else if (key === "tags") {
        if (value !== null && !Array.isArray(value)) {
          throw new Error("Tags deve ser um array");
        }
        validated[key] = value || [];
      }

      // Validar estimated_time (deve ser ISO string ou null)
      else if (key === "estimated_time") {
        if (value !== null) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error(
              "estimated_time deve ser uma data válida (ISO 8601)"
            );
          }
        }
        validated[key] = value;
      }

      // Validar color (deve ser hex válido)
      else if (key === "color") {
        if (value !== null) {
          const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
          if (!hexRegex.test(value)) {
            throw new Error(
              "Color deve ser uma cor hexadecimal válida (ex: #ff0000)"
            );
          }
        }
        validated[key] = value;
      }

      // Validar icon (string legada ou objeto { name, path, type, size } para imagem no storage)
      else if (key === "icon") {
        if (value !== null) {
          if (typeof value === "string") {
            validated[key] = value;
          } else if (typeof value === "object" && value.path !== undefined) {
            validated[key] = {
              name: value.name !== null && value.name !== undefined ? String(value.name) : "",
              path: String(value.path),
              size: value.size !== null && value.size !== undefined ? String(value.size) : "",
              type: value.type !== null && value.type !== undefined ? String(value.type) : "",
            };
          } else {
            throw new Error(
              "Icon deve ser uma string (emoji) ou objeto de imagem"
            );
          }
        } else {
          validated[key] = value;
        }
      }
    }

    return validated;
  }

  _canAccessAllOrganizationProjects(membership) {
    if (!membership?.id) return false;
    return orgRoleHasPermission(
      membership.member_role,
      ORG_PERMISSIONS.ACCESS_ALL_ORG_PROJECTS
    );
  }

  /**
   * Dono do projeto ou papel de workspace com acesso a todos os projetos da org ativa.
   * @returns {Promise<{ project: Object, orgWide: boolean, membership: Object }>}
   */
  async _getProjectOwnershipContext(projectId, userId) {
    if (!projectId) {
      throw new Error("ID do projeto é obrigatório");
    }

    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);

    if (this._canAccessAllOrganizationProjects(membership)) {
      const rows = await this.projectsRepository.getProjectByIdWithOrgScope(
        projectId,
        membership.id
      );
      if (!rows?.length) {
        throw new Error("Projeto não encontrado");
      }
      return { membership, orgWide: true, project: rows[0] };
    }

    const rows = await this.projectsRepository.getProjectById(
      projectId,
      userId
    );
    if (!rows?.length) {
      throw new Error("Projeto não encontrado");
    }
    return { membership, orgWide: false, project: rows[0] };
  }

  /**
   * Valida e verifica propriedade do projeto (ou gestão org-wide).
   * @param {string} projectId - ID do projeto
   * @param {string} userId - ID do usuário
   * @returns {Object} - Projeto encontrado
   * @throws {Error} - Se projeto não existir ou não pertencer ao usuário
   */
  async _validateProjectOwnership(projectId, userId) {
    const ctx = await this._getProjectOwnershipContext(projectId, userId);
    return ctx.project;
  }

  /**
   * Valida se o usuário tem acesso ao projeto (dono/colaborador ou role org-wide na mesma org_id).
   * @param {string} projectId - ID do projeto
   * @param {string} userId - ID do usuário
   * @returns {Object} - Projeto encontrado com dados completos
   * @throws {Error} - Se projeto não existir ou usuário não tiver acesso
   */
  async _validateProjectAccess(projectId, userId) {
    if (!projectId) {
      throw new Error("ID do projeto é obrigatório");
    }

    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);

    if (this._canAccessAllOrganizationProjects(membership)) {
      const rows = await this.projectsRepository.getProjectByIdWithOrgScope(
        projectId,
        membership.id
      );
      if (!rows?.length) {
        throw new Error("Projeto não encontrado ou você não tem acesso");
      }
      return rows[0];
    }

    const result = await this.projectsRepository.getProjectByIdWithAccess(
      projectId,
      userId
    );

    if (!result || result.length === 0) {
      throw new Error("Projeto não encontrado ou você não tem acesso");
    }

    return result[0];
  }

  /**
   * Permissão de escrita no conteúdo do projeto:
   * - Dono do projeto
   * - Administração org-wide (ACCESS_ALL_ORG_PROJECTS)
   * - Membro do projeto com role que tenha WRITE_PROJECT_CONTENT
   */
  async _ensureProjectWriteAccess(projectId, userId) {
    const project = await this._validateProjectAccess(projectId, userId);
    if (String(project.user_id) === String(userId)) return true;

    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);
    if (this._canAccessAllOrganizationProjects(membership)) {
      return true;
    }

    const projectRole = await this.projectsRepository.getProjectMemberRole(
      project.id,
      userId
    );
    return projectRoleHasPermission(
      projectRole,
      PROJECT_PERMISSIONS.WRITE_PROJECT_CONTENT
    );
  }

  /**
   * Formata a resposta padrão de um projeto
   * @param {Object} project - Dados do projeto do banco
   * @returns {Object} - Projeto formatado
   */
  _formatProjectResponse(project) {
    return {
      active: project.active ?? true,
      created_at: project.created_at,
      deleted: project.deleted,
      description: project.description,
      id: project.id,
      public_id: project.public_project_id || null,
      methodology: project.methodology,
      org_id: project.organization_id ?? project.org_id ?? null,
      parent_project_id: project.parent_project_id ?? null,
      projects_files: project.projects_files || [],
      properties: project.properties || {},
      status: project.status,
      title: project.title,
      updated_at: project.updated_at,
      user_id: project.user_id,
    };
  }

  /** Formato estável da linha `project_stages` (todas as colunas). */
  _formatProjectStage(row) {
    if (!row) return null;
    return {
      color: row.color,
      created_at: row.created_at,
      id: row.id,
      name: row.name,
      position:
        row.position !== undefined && row.position !== null
          ? Number(row.position)
          : row.position,
      project_id: row.project_id,
      properties:
        row.properties && typeof row.properties === "object"
          ? row.properties
          : {},
      updated_at: row.updated_at,
    };
  }

  /**
   * Trata erros específicos e retorna resposta HTTP apropriada
   * @param {Error} error - Erro capturado
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  _handleError(error, res, next) {
    const errorMessage = error.message;

    // Erros de validação (400 Bad Request)
    if (errorMessage.includes("obrigatório")) {
      return res.status(400).json({ error: errorMessage });
    }

    // Erros de autorização e não encontrado (404 Not Found)
    if (
      errorMessage.includes("não encontrado") ||
      errorMessage.includes("Acesso negado")
    ) {
      return res.status(404).json({ error: errorMessage });
    }

    // Outros erros passam para o middleware de erro global
    next(error);
  }
}

module.exports = ProjectsCoreController;
