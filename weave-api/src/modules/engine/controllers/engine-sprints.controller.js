const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const reportConfigRepository = require("../repositories/report-config.repository");
const sprintsRepository = require("../repositories/sprints.repository");
const {
  buildListEnvelope,
  hasAnyQueryKey,
} = require("@/utils/http/list-query");
const { ENGINE_SPRINTS_LIST_TRIGGER_KEYS } = require("../engine.validators");

class EngineSprintsController extends ProjectsCoreController {
  /**
   * Calculates the next report timestamp based on sprint config.
   *
   * @param {object} config - Report config with sprint dates joined
   * @returns {string|null} ISO timestamp or null
   */
  _calculateNextReportAt(config) {
    const sprintStart = config.current_sprint_start || config.sprint_start;
    const sprintEnd = config.current_sprint_end || config.sprint_end;
    const workableDays = config.sprint_workable_days ||
      config.default_workable_days || [1, 2, 3, 4, 5];

    if (!sprintStart || !sprintEnd) return null;

    const [hours, minutes] = (config.report_time_utc || "14:00").split(":");
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const start = new Date(sprintStart + "T00:00:00Z");
    const end = new Date(sprintEnd + "T00:00:00Z");

    const candidate = new Date(Math.max(today.getTime(), start.getTime()));

    while (candidate <= end) {
      const dayOfWeek = candidate.getUTCDay();
      const isStartDay = candidate.getTime() === start.getTime();
      const isEndDay = candidate.getTime() === end.getTime();
      const isWorkableDay = workableDays.includes(dayOfWeek);

      let hasReport = false;

      if (isStartDay && config.enable_sprint_kickoff) {
        hasReport = true;
      } else if (isEndDay && config.enable_sprint_review) {
        hasReport = true;
      } else if (
        !isStartDay &&
        !isEndDay &&
        isWorkableDay &&
        config.enable_daily_standup
      ) {
        hasReport = true;
      }

      if (hasReport) {
        const reportTime = new Date(candidate);
        reportTime.setUTCHours(
          parseInt(hours, 10),
          parseInt(minutes, 10),
          0,
          0
        );
        if (reportTime > now) {
          return reportTime.toISOString();
        }
      }

      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }

    return null;
  }

  /**
   * GET /api/v1/engine/projects/:projectId/sprints
   */
  async getProjectSprints(req, res, next) {
    try {
      const { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._validateProjectAccess(projectId, userId);
      const id = project.id;

      const wantsEnvelope = hasAnyQueryKey(
        req.query,
        ENGINE_SPRINTS_LIST_TRIGGER_KEYS
      );

      if (wantsEnvelope) {
        const { pagination, sort, filters } = req.parsedQuery;
        const { rows, total } = await sprintsRepository.getFilteredByProject(
          id,
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
            legacyKey: "sprints",
          })
        );
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
      const sprints = await sprintsRepository.getAllByProject(id, limit);

      res.status(200).json({ sprints });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/v1/engine/projects/:projectId/sprints/active
   */
  async getActiveSprint(req, res, next) {
    try {
      const { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._validateProjectAccess(projectId, userId);
      const id = project.id;

      const sprint = await sprintsRepository.getActiveByProject(id);

      res.status(200).json({ sprint: sprint || null });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/v1/engine/projects/:projectId/sprints
   * Creates a new sprint for a project.
   */
  async createSprint(req, res, next) {
    try {
      const { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const { title, goal, start_date, end_date, workable_days, activate } =
        req.body;

      if (!start_date || !end_date) {
        return res.status(400).json({
          error: "start_date and end_date are required",
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          error: "Invalid dates. Use ISO format (YYYY-MM-DD)",
        });
      }
      if (endDate < startDate) {
        return res.status(400).json({
          error: "end_date must be after start_date",
        });
      }

      const sprintNumber =
        await sprintsRepository.getNextSprintNumber(projectId);

      const sprint = await sprintsRepository.create({
        projectId,
        sprintNumber,
        title: title || `Sprint ${sprintNumber}`,
        goal: goal || null,
        status: activate ? "active" : "planned",
        startDate: start_date,
        endDate: end_date,
        workableDays: workable_days || [1, 2, 3, 4, 5],
      });

      // If activating, update the report config to point to this sprint
      if (activate) {
        const config = await reportConfigRepository.getByProjectId(projectId);
        if (config) {
          const nextAt = this._calculateNextReportAt({
            ...config,
            current_sprint_start: start_date,
            current_sprint_end: end_date,
            sprint_workable_days: workable_days || [1, 2, 3, 4, 5],
          });
          await reportConfigRepository.updateSchedulerState(config.id, {
            current_sprint_id: sprint.id,
            next_report_at: nextAt,
          });
        }
      }

      res.status(201).json({
        message: "Sprint created successfully",
        sprint,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PATCH /api/v1/engine/projects/:projectId/sprints/:sprintId/complete
   * Marks a sprint as completed.
   */
  async completeSprint(req, res, next) {
    try {
      const { projectId, sprintId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const { summary, metrics } = req.body;

      const sprint = await sprintsRepository.getById(sprintId);
      if (!sprint || sprint.project_id !== projectId) {
        return res.status(404).json({
          error: "Sprint not found",
        });
      }
      if (sprint.status === "completed") {
        return res.status(400).json({
          error: "Sprint is already completed",
        });
      }

      const completedSprint = await sprintsRepository.complete(sprintId, {
        summary,
        metrics,
      });

      // Check if auto_create_next_sprint is enabled
      const config = await reportConfigRepository.getByProjectId(projectId);
      let nextSprint = null;

      if (config && config.auto_create_next_sprint) {
        // Calculate next sprint dates
        const prevEnd = new Date(completedSprint.end_date);
        const nextStart = new Date(prevEnd);
        nextStart.setDate(nextStart.getDate() + 1);
        const nextEnd = new Date(nextStart);
        nextEnd.setDate(
          nextEnd.getDate() + (config.default_sprint_duration_days || 14) - 1
        );

        const nextNumber =
          await sprintsRepository.getNextSprintNumber(projectId);

        nextSprint = await sprintsRepository.create({
          projectId,
          sprintNumber: nextNumber,
          title: `Sprint ${nextNumber}`,
          status: "active",
          startDate: nextStart.toISOString().split("T")[0],
          endDate: nextEnd.toISOString().split("T")[0],
          workableDays: config.default_workable_days || [1, 2, 3, 4, 5],
        });

        // Update config to point to new sprint
        const nextAt = this._calculateNextReportAt({
          ...config,
          current_sprint_start: nextSprint.start_date,
          current_sprint_end: nextSprint.end_date,
          sprint_workable_days: nextSprint.workable_days,
        });

        await reportConfigRepository.updateSchedulerState(config.id, {
          current_sprint_id: nextSprint.id,
          next_report_at: nextAt,
        });
      }

      res.status(200).json({
        message: "Sprint completed successfully",
        completed_sprint: completedSprint,
        next_sprint: nextSprint,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new EngineSprintsController();
