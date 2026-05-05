const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const { normalizeProjectStatus } = require("@/utils/patterns/product-patterns");
const reportConfigRepository = require("@/modules/projects/repositories/report-config.repository");
const sprintsRepository = require("@/modules/projects/repositories/sprints.repository");
const reasoningsRepository = require("@/modules/projects/repositories/reasonings.repository");

class ProjectsReadController extends ProjectsCoreController {
  /**
   * GET /api/projects - Buscar todos os projetos do usuário
   * Lista todos os projetos pertencentes ao usuário autenticado com dados completos
   */
  async getAllProjects(req, res, next) {
    try {
      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );

      const projects =
        this._canAccessAllOrganizationProjects(membership) && membership.id
          ? await this.projectsRepository.getAllProjectsInOrganization(
              membership.id
            )
          : await this.projectsRepository.getAllProjects(userId);

      // Formatar projetos com todos os dados
      const formattedProjects = projects.map((project) => ({
        id: project.id,
        user_id: project.user_id,
        parent_project_id: project.parent_project_id || null,
        title: project.title,
        description: project.description,
        properties: project.properties || {},
        projects_files: project.projects_files || [],
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        deleted: project.deleted,
        owner: {
          id: project.user_id,
          username: project.owner_username,
          email: project.owner_email,
          name: project.owner_name,
          avatar_url: project.owner_avatar_url,
        },
        organization: project.organization_id
          ? {
              id: project.organization_id,
              name: project.organization_name,
              unique_name: project.organization_unique_name,
              logo_url: project.organization_logo_url,
            }
          : null,
        collaborators: project.collaborators || [],
        notes: project.associated_notes || [],
        subprojects: project.subprojects || [],
      }));

      res.status(200).json({ projects: formattedProjects });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
  /**
   * GET /api/projects/:id - Buscar um projeto específico
   * Retorna os detalhes de um projeto específico se o usuário tiver acesso (dono ou colaborador)
   */
  async getProjectById(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      // Validação de acesso ao projeto (dono ou colaborador)
      const project = await this._validateProjectAccess(id, userId);

      // Formatar e retornar o projeto com dados completos
      const formattedProject = {
        id: project.id,
        user_id: project.user_id,
        title: project.title,
        description: project.description,
        properties: project.properties || {},
        projects_files: project.projects_files || [],
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        deleted: project.deleted,
        owner: {
          id: project.user_id,
          username: project.owner_username,
          email: project.owner_email,
          name: project.owner_name,
          avatar_url: project.owner_avatar_url,
        },
        organization: project.organization_id
          ? {
              id: project.organization_id,
              name: project.organization_name,
              unique_name: project.organization_unique_name,
              logo_url: project.organization_logo_url,
            }
          : null,
        collaborators: project.collaborators || [],
        notes: project.associated_notes || [],
      };

      res.status(200).json(formattedProject);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
  /**
   * GET /api/projects/with-user - Buscar projetos com informações do usuário
   * Lista todos os projetos com dados completos do proprietário
   */
  async getProjectsWithUserInfo(req, res, next) {
    try {
      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      // Buscar projetos com informações do usuário
      const projects =
        await this.projectsRepository.getProjectsWithUserInfo(userId);

      if (!projects || projects.length === 0) {
        return res.status(200).json({ projects: [] });
      }

      // Formatar projetos com informações do proprietário
      const formattedProjects = projects.map((project) => ({
        id: project.id,
        title: project.title,
        description: project.description,
        properties: project.properties || {},
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        owner: {
          id: project.owner_id,
          username: project.owner_username,
          email: project.owner_email,
        },
      }));

      res.status(200).json({ projects: formattedProjects });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
  /**
   * GET /api/projects/:id/stages - Buscar as etapas (colunas) de um projeto
   * Retorna os stages de um projeto se o utilizador tiver acesso (dono ou colaborador)
   */
  async getProjectStages(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      // Validação de segurança: O utilizador tem acesso ao projeto?
      // Se não tiver, este método lança um erro automaticamente e vai para o catch
      await this._validateProjectAccess(id, userId);

      // Busca as etapas na base de dados
      const stages = await this.projectsRepository.getProjectStages(id);
      const formatted = (stages || []).map((s) => this._formatProjectStage(s));

      res.status(200).json({
        stages: formatted,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
  /**
   * GET /api/projects/:projectId/collaborators - Listar colaboradores
   * Lista todos os colaboradores de um projeto (acesso para donos e colaboradores)
   */
  async getCollaborators(req, res, next) {
    try {
      const { projectId } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );

      let project;
      if (this._canAccessAllOrganizationProjects(membership) && membership.id) {
        const rows = await this.projectsRepository.getProjectByIdWithOrgScope(
          projectId,
          membership.id
        );
        if (!rows?.length) {
          throw new Error("Projeto não encontrado ou você não tem acesso");
        }
        project = rows[0];
      } else {
        project = await this._validateProjectAccess(projectId, userId);
      }

      const collaborators = project.collaborators || [];

      res.status(200).json({
        collaborators: collaborators,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
  /**
   * GET /api/projects/:projectId/notes - Listar notas do projeto
   * Lista todas as notas associadas ao projeto (acesso para donos e colaboradores)
   */
  async getAssociatedNotes(req, res, next) {
    try {
      const { projectId } = req.params;

      // Validação de autenticação
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );
      const notes =
        this._canAccessAllOrganizationProjects(membership) && membership.id
          ? await this.projectsRepository.getAssociatedNotesWithOrgScope(
              projectId,
              membership.id
            )
          : await this.projectsRepository.getAssociatedNotes(projectId, userId);

      res.status(200).json({
        notes: notes,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
  async getProjectStats(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const VALID_METHODOLOGIES = ["kanban", "scrum", "waterfall", "custom"];

      const filters = {};

      if (req.query.status) {
        const normalizedStatus = normalizeProjectStatus(req.query.status);
        if (normalizedStatus) filters.status = normalizedStatus;
      }

      if (
        req.query.methodology &&
        VALID_METHODOLOGIES.includes(req.query.methodology)
      ) {
        filters.methodology = req.query.methodology;
      }

      if (req.query.from) {
        const from = new Date(req.query.from);
        if (!isNaN(from.getTime())) filters.from = from;
      }

      if (req.query.to) {
        const to = new Date(req.query.to);
        if (!isNaN(to.getTime())) filters.to = to;
      }

      filters.parent_only = req.query.parent_only !== "false";

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );

      const result =
        this._canAccessAllOrganizationProjects(membership) && membership.id
          ? await this.projectsRepository.getProjectStatsForOrganization(
              membership.id,
              userId,
              filters
            )
          : await this.projectsRepository.getProjectStats(userId, filters);
      const row = result[0];

      const tasks = row.tasks;
      const tasksTotal = parseInt(tasks.total) || 0;
      const tasksDone = parseInt(tasks.done) || 0;

      const overview = row.overview;
      const formattedOverview = {
        total: parseInt(overview.total) || 0,
        owned: parseInt(overview.owned) || 0,
        collaborating: parseInt(overview.collaborating) || 0,
        active: parseInt(overview.active) || 0,
        by_status: {
          OPEN: parseInt(overview.open) || 0,
          IN_PROGRESS: parseInt(overview.in_progress) || 0,
          PAUSED: parseInt(overview.paused) || 0,
          COMPLETED: parseInt(overview.completed) || 0,
          ARCHIVED: parseInt(overview.archived) || 0,
        },
      };

      const progress = row.progress;
      const formattedProgress = {
        average: parseFloat(progress.average) || 0,
        near_completion: parseInt(progress.near_completion) || 0,
        not_started: parseInt(progress.not_started) || 0,
      };

      const notes = row.notes;
      const formattedNotes = {
        total: parseInt(notes.total) || 0,
        VISIBLE: parseInt(notes.visible) || 0,
        ARCHIVED: parseInt(notes.archived) || 0,
        SECURE: parseInt(notes.secure) || 0,
      };

      res.status(200).json({
        overview: formattedOverview,
        methodology: {
          kanban: parseInt(row.methodology.kanban) || 0,
          scrum: parseInt(row.methodology.scrum) || 0,
          waterfall: parseInt(row.methodology.waterfall) || 0,
          custom: parseInt(row.methodology.custom) || 0,
        },
        progress: formattedProgress,
        notes: formattedNotes,
        tasks: {
          total: tasksTotal,
          done: tasksDone,
          pending: parseInt(tasks.pending) || 0,
          completion_rate:
            tasksTotal > 0
              ? Math.round((tasksDone / tasksTotal) * 1000) / 10
              : 0,
        },
        filters_applied: {
          status: filters.status || null,
          methodology: filters.methodology || null,
          from: filters.from || null,
          to: filters.to || null,
          parent_only: filters.parent_only,
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // AI Report Config & Sprints (Read)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * GET /api/projects/:id/ai-report-config
   * Returns the AI report configuration for a project.
   */
  async getAiReportConfig(req, res, next) {
    try {
      const { id: projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const config = await reportConfigRepository.getByProjectId(projectId);

      if (!config) {
        return res.status(200).json({ config: null });
      }

      res.status(200).json({ config });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:id/sprints
   * Returns sprint history for a project.
   */
  async getProjectSprints(req, res, next) {
    try {
      const { id: projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const sprints = await sprintsRepository.getAllByProject(projectId, limit);

      res.status(200).json({ sprints });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:id/sprints/active
   * Returns the currently active sprint for a project.
   */
  async getActiveSprint(req, res, next) {
    try {
      const { id: projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const sprint = await sprintsRepository.getActiveByProject(projectId);

      res.status(200).json({ sprint: sprint || null });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Reasonings (Read)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * GET /api/projects/:id/reasonings
   * Lists reasonings for a project, scoped by member access.
   * Query params: sprintId, reasoningType, limit
   */
  async getReasonings(req, res, next) {
    try {
      const { id: projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const options = {
        sprintId: req.query.sprintId || null,
        reasoningType: req.query.reasoningType || null,
        limit: req.query.limit || 20,
      };

      const reasonings = await reasoningsRepository.getByProjectSprint(
        projectId,
        userId,
        options
      );

      res.status(200).json({ reasonings });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:id/reasonings/:reasoningId
   * Returns the full content of a reasoning (heavy payload).
   * Also marks the reasoning as read for the current user.
   */
  async getReasoningById(req, res, next) {
    try {
      const { id: projectId, reasoningId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const content = await reasoningsRepository.getContentById(reasoningId);

      if (!content) {
        return res.status(404).json({ error: "Raciocínio não encontrado" });
      }

      // Mark as read (fire-and-forget)
      reasoningsRepository
        .upsertInteraction(reasoningId, userId, { isRead: true })
        .catch(() => {});

      res.status(200).json({ reasoning: content });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:id/reasonings/:reasoningId/action-items
   * Returns action items for a reasoning.
   */
  async getReasoningActionItems(req, res, next) {
    try {
      const { id: projectId, reasoningId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const actionItems =
        await reasoningsRepository.getActionItemsByReasoning(reasoningId);

      res.status(200).json({ actionItems });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new ProjectsReadController();
