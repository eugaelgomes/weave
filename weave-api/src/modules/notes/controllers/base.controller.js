const notesRepository = require("@/modules/notes/notes.repository");
const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const {
  orgRoleHasPermission,
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");
/**
 * Base dos controllers de notas: autenticação, acesso e formatação.
 */
class NotesBaseController {
  constructor() {
    this.notesRepository = notesRepository;
  }

  _validateAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }

    return userId;
  }

  _canAccessAllOrganizationProjects(membership) {
    if (!membership?.id) return false;
    return orgRoleHasPermission(
      membership.member_role,
      ORG_PERMISSIONS.ACCESS_ALL_ORG_PROJECTS
    );
  }

  /**
   * Nota associada a projeto da organização ativa e utilizador com ACCESS_ALL_ORG_PROJECTS.
   * @param {Object} note — linha de getNoteById
   * @param {string} userId
   */
  async _hasOrgWideAccessToProjectNote(note, userId) {
    if (!note?.project_id) return false;
    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);
    if (!this._canAccessAllOrganizationProjects(membership) || !membership.id) {
      return false;
    }
    const rows = await projectsRepository.getProjectByIdWithOrgScope(
      String(note.project_id),
      membership.id
    );
    return Boolean(rows?.length);
  }

  /** Org ativa quando o utilizador pode ver todas as notas dos projetos dessa org (via `project_id`). */
  async _getOrgWideNotesScopeOrganizationId(userId) {
    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);
    if (this._canAccessAllOrganizationProjects(membership) && membership.id) {
      return membership.id;
    }
    return null;
  }

  /**
   * Valida e verifica propriedade da nota ou se é colaborador
   * @param {string} noteId
   * @param {string} userId
   * @returns {Object}
   * @throws {Error}
   */
  async _validateNoteAccess(noteId, userId) {
    if (!noteId) {
      throw new Error("ID da nota é obrigatório");
    }

    const note = await this.notesRepository.getNoteById(noteId);

    if (!note) {
      throw new Error("Nota não encontrada");
    }

    const isOwner = note.user_id === userId;

    const isCollaborator = await this.notesRepository.isCollaborator(
      noteId,
      userId
    );

    if (isOwner || isCollaborator) {
      return {
        hasOrgProjectAccess: false,
        isCollaborator,
        isOwner,
        note,
      };
    }

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(
      note,
      userId
    );
    if (hasOrgProjectAccess) {
      return {
        hasOrgProjectAccess: true,
        isCollaborator: false,
        isOwner: false,
        note,
      };
    }

    throw new Error("Acesso negado");
  }

  /**
   * Variante otimizada para caminhos de alta frequência (edição de blocos).
   * Evita carregar payload completo da nota quando só precisamos validar acesso.
   * @param {string} noteId
   * @param {string} userId
   * @returns {Promise<{ note: Object, isOwner: boolean, isCollaborator: boolean, hasOrgProjectAccess: boolean }>}
   */
  async _validateNoteAccessLightweight(noteId, userId) {
    if (!noteId) {
      throw new Error("ID da nota é obrigatório");
    }

    const note = await this.notesRepository.getNoteAccessSummary(noteId);
    if (!note) {
      throw new Error("Nota não encontrada");
    }

    const isOwner = note.user_id === userId;
    if (isOwner) {
      return {
        hasOrgProjectAccess: false,
        isCollaborator: false,
        isOwner: true,
        note,
      };
    }

    const isCollaborator = await this.notesRepository.isCollaborator(noteId, userId);
    if (isCollaborator) {
      return {
        hasOrgProjectAccess: false,
        isCollaborator: true,
        isOwner: false,
        note,
      };
    }

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(note, userId);
    if (hasOrgProjectAccess) {
      return {
        hasOrgProjectAccess: true,
        isCollaborator: false,
        isOwner: false,
        note,
      };
    }

    throw new Error("Acesso negado");
  }

  /**
   * Valida e verifica propriedade da nota
   * @param {string} noteId
   * @param {string} userId
   * @returns {Object}
   * @throws {Error}
   */
  async _validateNoteOwnership(noteId, userId) {
    if (!noteId) {
      throw new Error("ID da nota é obrigatório");
    }

    const note = await this.notesRepository.getNoteById(noteId);

    if (!note) {
      throw new Error("Nota não encontrada");
    }

    if (note.user_id === userId) {
      return note;
    }

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(
      note,
      userId
    );
    if (hasOrgProjectAccess) {
      return note;
    }

    throw new Error("Acesso negado");
  }

  /**
   * Formata a resposta padrão de uma nota
   * @param {Object} note
   * @param {Array} blocks
   * @returns {Object}
   */
  _formatNoteResponse(note, blocks = [], options = {}) {
    const { includeBlocks = true } = options;
    const projectId = note.project_id ? String(note.project_id) : null;
    return {
      id: note.id.toString(),
      title: note.title,
      description: note.description,
      properties: note.properties || {},
      tags: note.tags || [],
      status: note.status,
      due_date: note.due_date ?? null,
      priority_id: note.priority_id ?? null,
      priority_name: note.priority_name ?? null,
      priority_color: note.priority_color ?? null,
      created_at: note.created_at,
      updated_at: note.updated_at,
      associated_project: projectId
        ? {
            id: projectId,
            name: note.project_name || "",
            stage_id: note.project_stage_id
              ? String(note.project_stage_id)
              : null,
            stage_name: note.project_stage_name || null,
          }
        : null,
      blocks: includeBlocks && Array.isArray(blocks) ? blocks : [],
    };
  }

  /**
   * Trata erros específicos e retorna resposta HTTP apropriada
   * @param {Error} error
   * @param {Object} res
   * @param {Function} next
   */
  _handleError(error, res, next) {
    const errorMessage = error.message;

    if (errorMessage.includes("obrigatório")) {
      return res.status(400).json({ error: errorMessage });
    }

    if (
      errorMessage.includes("inválido") ||
      errorMessage.includes("Nenhum campo") ||
      errorMessage.includes("Nenhum arquivo")
    ) {
      return res.status(400).json({ error: errorMessage });
    }

    if (
      errorMessage.includes("não encontrada") ||
      errorMessage.includes("não encontrado") ||
      errorMessage.includes("Acesso negado")
    ) {
      return res.status(404).json({ error: errorMessage });
    }

    next(error);
  }
}

module.exports = NotesBaseController;
