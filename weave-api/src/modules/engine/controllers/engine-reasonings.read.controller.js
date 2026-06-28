const EngineReasoningsBaseController = require("./engine-reasonings.base.controller");
const reasoningsRepository = require("../repositories/reasonings.repository");
const {
  buildListEnvelope,
  hasAnyQueryKey,
} = require("@/utils/http/list-query");
const { ENGINE_REASONINGS_LIST_TRIGGER_KEYS } = require("../engine.validators");

class EngineReasoningsReadController extends EngineReasoningsBaseController {
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
          limit: req.query.limit || 20,
          reasoningType: req.query.reasoningType || null,
          sprintId: req.query.sprintId || null,
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
          filters: this._echoFilters(filters),
          legacyKey: "reasonings",
          limit: pagination.limit,
          page: pagination.page,
          sort,
          total,
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
        return res.status(404).json({ error: "Reasoning not found" });
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
}

module.exports = new EngineReasoningsReadController();
