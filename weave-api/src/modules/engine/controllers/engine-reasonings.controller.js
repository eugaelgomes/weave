const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const reportConfigRepository = require("../repositories/report-config.repository");
const sprintsRepository = require("../repositories/sprints.repository");
const reasoningsRepository = require("../repositories/reasonings.repository");
const { getReasoningTriggerQueueRedisKey } = require("@/services/queue/queue-keys");
const { buildListEnvelope, hasAnyQueryKey } = require("@/utils/http/list-query");
const { ENGINE_REASONINGS_LIST_TRIGGER_KEYS } = require("../engine.validators");
const redis = require("@/services/queue/consumer-connection");

class EngineReasoningsController extends ProjectsCoreController {

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

  // ══════════════════════════════════════════════════════════════════════
  // AI Report Config
  // ══════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/engine/projects/:projectId/ai-report-config
   */
  async getAiReportConfig(req, res, next) {
    try {
      const { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._validateProjectAccess(projectId, userId);
      const id = project.id;

      const config = await reportConfigRepository.getByProjectId(id);

      if (!config) {
        return res.status(200).json({ config: null });
      }

      res.status(200).json({ config });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/v1/engine/projects/:projectId/ai-report-config
   */
  async updateAiReportConfig(req, res, next) {
    try {
      const { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const {
        enabled,
        default_sprint_duration_days,
        default_workable_days,
        auto_create_next_sprint,
        enable_sprint_kickoff,
        enable_daily_standup,
        enable_sprint_review,
        report_time_utc,
        channels,
        recipient_scope,
        custom_recipients,
        reasoning_instructions,
      } = req.body;

      // Validate report_time_utc format
      if (report_time_utc && !/^\d{2}:\d{2}$/.test(report_time_utc)) {
        return res.status(400).json({
          error: "report_time_utc deve estar no formato HH:mm",
        });
      }

      // Validate channels
      const validChannels = ["in_app", "email"];
      if (channels && !channels.every((c) => validChannels.includes(c))) {
        return res.status(400).json({
          error: `channels deve conter apenas: ${validChannels.join(", ")}`,
        });
      }

      // Validate recipient_scope
      const validScopes = ["owner_only", "all_members", "custom"];
      if (recipient_scope && !validScopes.includes(recipient_scope)) {
        return res.status(400).json({
          error: `recipient_scope deve ser: ${validScopes.join(", ")}`,
        });
      }

      // Validate workable_days
      if (default_workable_days) {
        const allValid = default_workable_days.every(
          (d) => Number.isInteger(d) && d >= 0 && d <= 6
        );
        if (!allValid) {
          return res.status(400).json({
            error:
              "default_workable_days deve conter valores entre 0 (Dom) e 6 (Sáb)",
          });
        }
      }

      let normalizedReasoningInstructions;
      if (reasoning_instructions !== undefined) {
        try {
          const {
            normalizeReasoningInstructions,
          } = require("@/utils/reasoning-instructions");
          normalizedReasoningInstructions = normalizeReasoningInstructions(
            reasoning_instructions
          );
        } catch (normalizeErr) {
          if (normalizeErr?.statusCode === 400) {
            return res.status(400).json({ error: normalizeErr.message });
          }
          throw normalizeErr;
        }
      }

      const config = await reportConfigRepository.upsert(projectId, userId, {
        enabled,
        default_sprint_duration_days,
        default_workable_days,
        auto_create_next_sprint,
        enable_sprint_kickoff,
        enable_daily_standup,
        enable_sprint_review,
        report_time_utc,
        channels,
        recipient_scope,
        custom_recipients,
        ...(normalizedReasoningInstructions !== undefined
          ? { reasoning_instructions: normalizedReasoningInstructions }
          : {}),
      });

      if (config.enabled && config.current_sprint_id) {
        const nextAt = this._calculateNextReportAt(config);
        if (nextAt) {
          await reportConfigRepository.updateSchedulerState(config.id, {
            next_report_at: nextAt,
          });
          config.next_report_at = nextAt;
        }
      }

      res.status(200).json({
        message: "Configuração de relatório atualizada com sucesso",
        config,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Reasonings
  // ══════════════════════════════════════════════════════════════════════

  /**
   * GET /api/v1/engine/projects/:projectId/reasonings
   */
  async getReasonings(req, res, next) {
    try {
      const { projectId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const project = await this._validateProjectAccess(projectId, userId);
      const id = project.id;

      const wantsEnvelope = hasAnyQueryKey(
        req.query,
        ENGINE_REASONINGS_LIST_TRIGGER_KEYS
      );

      if (!wantsEnvelope) {
        const options = {
          sprintId: req.query.sprintId || null,
          reasoningType: req.query.reasoningType || null,
          limit: req.query.limit || 20,
        };

        const reasonings = await reasoningsRepository.getByProjectSprint(
          id,
          userId,
          options
        );

        return res.status(200).json({ reasonings });
      }

      const { pagination, sort, filters } = req.parsedQuery;
      const { rows, total } = await reasoningsRepository.listByProjectForMember(
        id,
        userId,
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
          legacyKey: "reasonings",
        })
      );
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/v1/engine/projects/:projectId/reasonings/:reasoningId
   */
  async getReasoningById(req, res, next) {
    try {
      const { reasoningId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const content = await reasoningsRepository.getContentById(reasoningId);

      if (!content) {
        return res.status(404).json({ error: "Raciocínio não encontrado" });
      }

      reasoningsRepository
        .upsertInteraction(reasoningId, userId, { isRead: true })
        .catch(() => {});

      res.status(200).json({ reasoning: content });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/v1/engine/projects/:projectId/reasonings/:reasoningId/action-items
   */
  async getReasoningActionItems(req, res, next) {
    try {
      const { reasoningId } = req.params;

      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const actionItems =
        await reasoningsRepository.getActionItemsByReasoning(reasoningId);

      res.status(200).json({ actionItems });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/v1/engine/projects/:projectId/reasonings/trigger
   */
  async triggerReasoningGeneration(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const requestedType = String(req.body?.reasoningType || "analysis")
        .trim()
        .toLowerCase();
      const reasoningType = this._normalizeReasoningType(requestedType);
      const requestedSprintId = req.body?.sprintId
        ? String(req.body.sprintId)
        : null;
      const titleOverride = req.body?.title
        ? String(req.body.title).trim()
        : null;

      const reportConfig = await reportConfigRepository.getByProjectId(projectId);
      if (!reportConfig) {
        return res.status(400).json({
          error:
            "Configure o relatório de IA do projeto antes de gerar reasonings.",
        });
      }

      let sprint = null;
      if (requestedSprintId) {
        sprint = await sprintsRepository.getById(requestedSprintId);
        if (!sprint || String(sprint.project_id) !== String(projectId)) {
          return res
            .status(404)
            .json({ error: "Sprint não encontrada para este projeto." });
        }
      } else {
        sprint = await sprintsRepository.getActiveByProject(projectId);
      }

      if (!sprint && reasoningType !== "analysis") {
        return res.status(400).json({
          error:
            "Não há sprint ativa. Defina uma sprint para gerar o reasoning.",
        });
      }

      const trigger = {
        projectId,
        sprintId: sprint ? sprint.id : null,
        reportType: reasoningType,
        reasoningType,
        title:
          titleOverride ||
          `${this._reasoningTypeLabel(reasoningType)} (${new Date()
            .toISOString()
            .slice(0, 10)})`,
        triggeredBy: userId,
        config: sprint ? {
          ...reportConfig,
          project_id: projectId,
          sprint_id: sprint.id,
          sprint_number: sprint.sprint_number,
          sprint_title: sprint.title,
          sprint_status: sprint.status,
          sprint_start: sprint.start_date,
          sprint_end: sprint.end_date,
          sprint_workable_days: sprint.workable_days ||
            reportConfig.default_workable_days || [1, 2, 3, 4, 5],
        } : {
          ...reportConfig,
          project_id: projectId,
        },
        triggeredAt: new Date().toISOString(),
      };

      const queueKey = getReasoningTriggerQueueRedisKey();
      await redis.rpush(queueKey, JSON.stringify(trigger));

      res.status(202).json({
        message: "Solicitação de reasoning enviada para processamento.",
        queued: true,
        reasoningType,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/v1/engine/projects/:projectId/reasonings
   */
  async createReasoning(req, res, next) {
    try {
      const { projectId } = req.params;
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const { sprintId, reasoningType, title, content, options } = req.body;

      if (!reasoningType || !title) {
        return res.status(400).json({
          error: "reasoningType e title são obrigatórios",
        });
      }

      const reasoning = await reasoningsRepository.create({
        projectId,
        sprintId: sprintId || null,
        triggeredBy: userId,
        reasoningType,
        title,
        content: content || {},
        options: options || {},
      });

      res.status(201).json({ reasoning });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PATCH /api/v1/engine/projects/:projectId/reasonings/:reasoningId/interaction
   */
  async updateReasoningInteraction(req, res, next) {
    try {
      const { projectId, reasoningId } = req.params;
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const { isRead, isDismissed, isPinned, feedback } = req.body;

      const interaction = await reasoningsRepository.upsertInteraction(
        reasoningId,
        userId,
        { isRead, isDismissed, isPinned, feedback }
      );

      res.status(200).json({ interaction });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PATCH /api/v1/engine/projects/:projectId/reasonings/:reasoningId/action-items/:itemId
   */
  async updateReasoningActionItem(req, res, next) {
    try {
      const { projectId, itemId } = req.params;
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      await this._validateProjectAccess(projectId, userId);

      const { isCompleted, assignedTo, priority } = req.body;

      const actionItem = await reasoningsRepository.updateActionItem(itemId, {
        isCompleted,
        completedBy: isCompleted ? userId : null,
        assignedTo,
        priority,
      });

      if (!actionItem) {
        return res.status(404).json({ error: "Action item não encontrado" });
      }

      res.status(200).json({ actionItem });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  _normalizeReasoningType(type) {
    const normalized = String(type || "").trim();
    const valid = [
      "sprint_kickoff",
      "daily_standup",
      "sprint_review",
      "deadline_alert",
      "analysis",
    ];
    return valid.includes(normalized) ? normalized : "analysis";
  }

  /**
   * @param {string} type
   * @returns {string}
   */
  _reasoningTypeLabel(type) {
    const labels = {
      sprint_kickoff: "Sprint kickoff",
      daily_standup: "Daily standup",
      sprint_review: "Sprint review",
      deadline_alert: "Deadline alert",
      analysis: "Analysis",
    };
    return labels[type] || "Reasoning";
  }
}

module.exports = new EngineReasoningsController();
