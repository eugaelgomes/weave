const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");

class EngineReasoningsBaseController extends ProjectsCoreController {
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
      analysis: "Analysis",
      daily_standup: "Daily standup",
      deadline_alert: "Deadline alert",
      sprint_kickoff: "Sprint kickoff",
      sprint_review: "Sprint review",
    };
    return labels[type] || "Reasoning";
  }
}

module.exports = EngineReasoningsBaseController;
