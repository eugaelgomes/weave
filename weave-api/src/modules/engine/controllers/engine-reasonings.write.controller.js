const EngineReasoningsBaseController = require("./engine-reasonings.base.controller");
const reportConfigRepository = require("../repositories/report-config.repository");
const sprintsRepository = require("../repositories/sprints.repository");
const reasoningsRepository = require("../repositories/reasonings.repository");

const {
  getReasoningTriggerQueueRedisKey,
} = require("@/services/queue/queue-keys");
const redis = require("@/services/queue/consumer-connection");

class EngineReasoningsWriteController extends EngineReasoningsBaseController {
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

      const reportConfig =
        await reportConfigRepository.getByProjectId(projectId);
      if (!reportConfig) {
        return res.status(400).json({
          error:
            "Configure the project's AI report before generating reasonings.",
        });
      }

      let sprint = null;
      if (requestedSprintId) {
        sprint = await sprintsRepository.getById(requestedSprintId);
        if (!sprint || String(sprint.project_id) !== String(projectId)) {
          return res
            .status(404)
            .json({ error: "Sprint not found for this project." });
        }
      } else {
        sprint = await sprintsRepository.getActiveByProject(projectId);
      }

      if (!sprint && reasoningType !== "analysis") {
        return res.status(400).json({
          error:
            "There is no active sprint. Define a sprint to generate the reasoning.",
        });
      }

      const trigger = {
        config: sprint
          ? {
              ...reportConfig,
              sprint_end: sprint.end_date,
              sprint_id: sprint.id,
              sprint_number: sprint.sprint_number,
              sprint_start: sprint.start_date,
              sprint_status: sprint.status,
              sprint_title: sprint.title,
              sprint_workable_days: sprint.workable_days ||
                reportConfig.default_workable_days || [1, 2, 3, 4, 5],
            }
          : {
              ...reportConfig,
              project_id: projectId,
            },
        projectId,
        reasoningType,
        reportType: reasoningType,
        sprintId: sprint ? sprint.id : null,
        title:
          titleOverride ||
          `${this._reasoningTypeLabel(reasoningType)} (${new Date()
            .toISOString()
            .slice(0, 10)})`,
        triggeredAt: new Date().toISOString(),
        triggeredBy: userId,
      };

      const queueKey = getReasoningTriggerQueueRedisKey();
      await redis.rpush(queueKey, JSON.stringify(trigger));

      res.status(202).json({
        message: "Reasoning request queued for processing.",
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
          error: "reasoningType and title are required",
        });
      }

      const reasoning = await reasoningsRepository.create({
        content: content || {},
        options: options || {},
        projectId,
        reasoningType,
        sprintId: sprintId || null,
        title,
        triggeredBy: userId,
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
        { feedback, isDismissed, isPinned, isRead }
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
        assignedTo,
        completedBy: isCompleted ? userId : null,
        isCompleted,
        priority,
      });

      if (!actionItem) {
        return res.status(404).json({ error: "Action item not found" });
      }

      res.status(200).json({ actionItem });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new EngineReasoningsWriteController();
