const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const { normalizeProjectStatus } = require("@/utils/patterns/product-patterns");

const {
  buildListEnvelope,
  hasAnyQueryKey,
} = require("@/utils/http/list-query");
const {
  PROJECTS_LIST_TRIGGER_KEYS,
  PROJECT_STAGES_LIST_TRIGGER_KEYS,
  PROJECT_NOTES_LIST_TRIGGER_KEYS,
  PROJECT_COLLABORATORS_LIST_TRIGGER_KEYS,
  PROJECT_SPRINTS_LIST_TRIGGER_KEYS,
  PROJECT_REASONINGS_LIST_TRIGGER_KEYS,
} = require("@/modules/projects/projects.validators");

class ProjectsReadController extends ProjectsCoreController {
  /**
   * @param {Record<string, unknown>} filters
   * @returns {Record<string, unknown>}
   */
  _echoFilters(filters) {
    const out = { ...filters };
    for (const key of Object.keys(out)) {
      const v = out[key];
      if (v instanceof Date) {
        out[key] = v.toISOString();
      }
    }
    return out;
  }

  /**
   * Loads project row with aggregates (owner, org, collaborators, notes) for read handlers.
   *
   * @param {string} projectId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async _loadProjectForRead(projectId, userId) {
    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);

    if (this._canAccessAllOrganizationProjects(membership) && membership.id) {
      const rows = await this.projectsRepository.getProjectByIdWithOrgScope(
        projectId,
        membership.id
      );
      if (!rows?.length) {
        throw new Error("Projeto não encontrado ou você não tem acesso");
      }
      return rows[0];
    }

    return this._validateProjectAccess(projectId, userId);
  }

  /**
   * GET /api/projects — list root projects (optional filters + pagination envelope).
   *
   * @example Legacy: GET /api/v1/projects → `{ projects: [...] }`
   * @example Filtered: GET /api/v1/projects?page=1&limit=20&sort=updated_at:desc → envelope + `projects` alias
   */
  async getAllProjects(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );

      const wantsEnvelope = hasAnyQueryKey(
        req.query,
        PROJECTS_LIST_TRIGGER_KEYS
      );

      if (wantsEnvelope) {
        const {
          pagination,
          sort,
          include: includeArr,
          filters,
        } = req.parsedQuery;

        const filtersForRepo = { ...filters };
        if (!this._canAccessAllOrganizationProjects(membership)) {
          filtersForRepo.organization_id = null;
        }

        const include = {
          collaborators: false,
          notes: false,
          subprojects: false,
        };

        const orgWide =
          this._canAccessAllOrganizationProjects(membership) && membership.id;
        const scope = orgWide
          ? { mode: "organization", organizationId: membership.id }
          : { mode: "user", userId };

        const { rows, total } =
          await this.projectsRepository.getAllProjectsFiltered(
            scope,
            filtersForRepo,
            pagination,
            sort,
            include,
            userId
          );

        const formattedProjects = rows.map((project) => {
          const formatted = this._formatProjectResponse(project);
          return {
            ...formatted,
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
          };
        });

        return res.status(200).json(
          buildListEnvelope({
            data: formattedProjects,
            page: pagination.page,
            limit: pagination.limit,
            total,
            sort,
            filters: this._echoFilters({
              ...filtersForRepo,
              include: includeArr,
            }),
            legacyKey: "projects",
          })
        );
      }

      const projects =
        this._canAccessAllOrganizationProjects(membership) && membership.id
          ? await this.projectsRepository.getAllProjectsInOrganization(
              membership.id
            )
          : await this.projectsRepository.getAllProjects(userId);

      const formattedProjects = projects.map((project) => {
        const formatted = this._formatProjectResponse(project);
        return {
          ...formatted,
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
        };
      });

      res.status(200).json({ projects: formattedProjects });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:id — project detail; `?include=` controls payload shape.
   *
   * @example GET /api/v1/projects/:id?include=collaborators,notes,subprojects,stages
   */
  async getProjectById(req, res, next) {
    try {
      const { id } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._loadProjectForRead(id, userId);
      const include = req.parsedQuery?.include || ["collaborators", "notes"];

      const formatted = this._formatProjectResponse(project);
      /** @type {Record<string, unknown>} */
      const formattedProject = {
        ...formatted,
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
      };

      if (include.includes("collaborators")) {
        formattedProject.collaborators = project.collaborators || [];
      } else {
        formattedProject.collaborators = [];
      }

      if (include.includes("notes")) {
        formattedProject.notes = project.associated_notes || [];
      } else {
        formattedProject.notes = [];
      }

      if (include.includes("subprojects")) {
        formattedProject.subprojects =
          await this.projectsRepository.getSubprojectsLight(id);
      }

      if (include.includes("stages")) {
        const stages = await this.projectsRepository.getProjectStages(
          project.id
        );
        formattedProject.stages = (stages || []).map((s) =>
          this._formatProjectStage(s)
        );
      }

      res.status(200).json(formattedProject);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/with-user — legacy helper (unchanged contract).
   */
  async getProjectsWithUserInfo(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const projects =
        await this.projectsRepository.getProjectsWithUserInfo(userId);

      if (!projects || projects.length === 0) {
        return res.status(200).json({ projects: [] });
      }

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
   * GET /api/projects/:id/stages
   */
  async getProjectStages(req, res, next) {
    try {
      const { id } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._loadProjectForRead(id, userId);
      const projectId = project.id;

      const wantsEnvelope = hasAnyQueryKey(
        req.query,
        PROJECT_STAGES_LIST_TRIGGER_KEYS
      );

      if (wantsEnvelope) {
        const { pagination, sort, filters } = req.parsedQuery;
        const { rows, total } =
          await this.projectsRepository.getProjectStagesFiltered(
            id,
            filters,
            pagination,
            sort
          );
        const formatted = rows.map((s) => this._formatProjectStage(s));
        return res.status(200).json(
          buildListEnvelope({
            data: formatted,
            page: pagination.page,
            limit: pagination.limit,
            total,
            sort,
            filters: this._echoFilters(filters),
            legacyKey: "stages",
          })
        );
      }

      const stages = await this.projectsRepository.getProjectStages(projectId);
      const formatted = (stages || []).map((s) => this._formatProjectStage(s));

      res.status(200).json({
        stages: formatted,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:projectId/collaborators
   */
  async getCollaborators(req, res, next) {
    try {
      let { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._loadProjectForRead(projectId, userId);
      projectId = project.id;

      const wantsEnvelope = hasAnyQueryKey(
        req.query,
        PROJECT_COLLABORATORS_LIST_TRIGGER_KEYS
      );

      const { pagination, sort, filters } = req.parsedQuery;
      const effectivePagination = wantsEnvelope
        ? pagination
        : { page: 1, limit: 500, offset: 0 };

      const { rows, total } =
        await this.projectsRepository.listProjectCollaboratorsFiltered(
          projectId,
          filters,
          effectivePagination,
          sort
        );

      const collaborators = rows.map((r) => ({
        user_id: r.user_id,
        name: r.name,
        username: r.username,
        email: r.email,
        avatar_url: r.avatar_url,
        role: r.role,
        added_at: r.added_at,
        added_by: r.added_by,
      }));

      if (wantsEnvelope) {
        return res.status(200).json(
          buildListEnvelope({
            data: collaborators,
            page: effectivePagination.page,
            limit: effectivePagination.limit,
            total,
            sort,
            filters: this._echoFilters(filters),
            legacyKey: "collaborators",
          })
        );
      }

      res.status(200).json({
        collaborators,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/projects/:projectId/notes
   */
  async getAssociatedNotes(req, res, next) {
    try {
      let { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._loadProjectForRead(projectId, userId);
      projectId = project.id;

      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );

      const wantsEnvelope = hasAnyQueryKey(
        req.query,
        PROJECT_NOTES_LIST_TRIGGER_KEYS
      );

      const orgWide =
        this._canAccessAllOrganizationProjects(membership) && membership.id;
      const scope = orgWide
        ? { type: "organization", organizationId: membership.id }
        : { type: "member", userId };

      if (wantsEnvelope) {
        const { pagination, sort, filters } = req.parsedQuery;
        const { rows, total } =
          await this.projectsRepository.getAssociatedNotesFiltered(
            projectId,
            scope,
            filters,
            pagination,
            sort
          );

        return res.status(200).json(
          buildListEnvelope({
            data: rows,
            page: pagination.page,
            limit: pagination.limit,
            total,
            sort,
            filters: this._echoFilters(filters),
            legacyKey: "notes",
          })
        );
      }

      const notes = orgWide
        ? await this.projectsRepository.getAssociatedNotesWithOrgScope(
            projectId,
            membership.id
          )
        : await this.projectsRepository.getAssociatedNotes(projectId, userId);

      res.status(200).json({
        notes,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getProjectStats(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const VALID_METHODOLOGIES = ["kanban", "scrum"];

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

}

module.exports = new ProjectsReadController();
