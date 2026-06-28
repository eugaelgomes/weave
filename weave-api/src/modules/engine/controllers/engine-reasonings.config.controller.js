const EngineReasoningsBaseController = require("./engine-reasonings.base.controller");
const reportConfigRepository = require("../repositories/report-config.repository");

class EngineReasoningsConfigController extends EngineReasoningsBaseController {
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

      if (report_time_utc && !/^\d{2}:\d{2}$/.test(report_time_utc)) {
        return res.status(400).json({
          error: "report_time_utc must be in HH:mm format",
        });
      }

      const validChannels = ["in_app", "email"];
      if (channels && !channels.every((c) => validChannels.includes(c))) {
        return res.status(400).json({
          error: `channels must contain only: ${validChannels.join(", ")}`,
        });
      }

      const validScopes = ["owner_only", "all_members", "custom"];
      if (recipient_scope && !validScopes.includes(recipient_scope)) {
        return res.status(400).json({
          error: `recipient_scope must be one of: ${validScopes.join(", ")}`,
        });
      }

      if (default_workable_days) {
        const allValid = default_workable_days.every(
          (d) => Number.isInteger(d) && d >= 0 && d <= 6
        );
        if (!allValid) {
          return res.status(400).json({
            error:
              "default_workable_days must contain values between 0 (Sun) and 6 (Sat)",
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
        auto_create_next_sprint,
        channels,
        custom_recipients,
        default_sprint_duration_days,
        default_workable_days,
        enable_daily_standup,
        enable_sprint_kickoff,
        enable_sprint_review,
        enabled,
        recipient_scope,
        report_time_utc,
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
        config,
        message: "Report configuration updated successfully",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new EngineReasoningsConfigController();
