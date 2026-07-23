const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const PlanUsageManager = require("@/modules/plans/controllers/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/modules/plans/utils/plan-paths.util");

/**
 * Authenticated, minimal plan + usage snapshot for web clients (polling / gates).
 * No PII. API token sessions are rejected until a dedicated contract exists.
 */
class PlansMeController {
  /**
   * @param {Record<string, unknown>} planDetails
   * @param {Record<string, unknown>} usageDetails
   * @param {string} usagePath
   * @param {string} limitPath
   * @returns {{ allowed: boolean, current: number, limit: number | null }}
   */
  _gate(planDetails, usageDetails, usagePath, limitPath) {
    const rawCurrent = PlanUsageManager.getNestedValue(usageDetails, usagePath);
    const rawLimit = PlanUsageManager.getNestedValue(planDetails, limitPath);
    const allowed = PlanUsageManager.checkLimit(
      planDetails,
      usageDetails,
      usagePath,
      limitPath
    );
    const current =
      rawCurrent === null || rawCurrent === undefined ? 0 : Number(rawCurrent);
    const limit =
      rawLimit === null || rawLimit === undefined ? null : Number(rawLimit);

    return {
      allowed,
      current: Number.isFinite(current) ? current : 0,
      limit: limit === null || Number.isFinite(limit) ? limit : null,
    };
  }

  /**
   * GET /plans/me
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getPlanMe(req, res) {
    try {
      if (req.user?.isApiCall) {
        return res.status(403).json({
          error: "Not available for API token session",
          message:
            "Plan usage snapshot is only available for web sessions at this time.",
        });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userPlan = await PlansRepository.getUserAndPlan(userId);
      if (!userPlan?.plan_id) {
        return res.status(404).json({ message: "Plan not found for user" });
      }

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const planRow = await PlansRepository.getPlanById(userPlan.plan_id);

      if (!usageRecord || !planRow) {
        return res.status(404).json({
          message: "Usage or plan configuration not found",
        });
      }

      const planDetails =
        usageRecord.applied_plan_snapshot ||
        userPlan.plan_details ||
        planRow.details ||
        {};

      const ud = usageRecord.usage_details || {};

      const usage_summary = {
        backups_monthly:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
          ) ?? 0,
        exports_notes_monthly:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT
          ) ?? 0,
        notes_total:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.SUMMARY.NOTES_TOTAL
          ) ?? 0,
        projects_total:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.SUMMARY.PROJECTS_TOTAL
          ) ?? 0,
        storage_uploaded_mb_monthly:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB
          ) ?? 0,
        team_members_total:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.SUMMARY.TEAM_MEMBERS_TOTAL
          ) ?? 0,
        weave_ai_messages_monthly:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT
          ) ?? 0,
      };

      const usage_period = {
        period_end:
          PlanUsageManager.getNestedValue(ud, USAGE_PATHS.MONTHLY.PERIOD_END) ??
          null,
        period_start:
          PlanUsageManager.getNestedValue(
            ud,
            USAGE_PATHS.MONTHLY.PERIOD_START
          ) ?? null,
        plan_id: usageRecord.plan_id || userPlan.plan_id,
      };

      const gates = {
        backups_monthly: this._gate(
          planDetails,
          ud,
          USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT,
          PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
        ),
        exports_notes_monthly: this._gate(
          planDetails,
          ud,
          USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT,
          PLAN_PATHS.LIMITS.EXPORTS.NOTES_MONTHLY
        ),
        notes: this._gate(
          planDetails,
          ud,
          USAGE_PATHS.SUMMARY.NOTES_TOTAL,
          PLAN_PATHS.LIMITS.MAX_NOTES
        ),
        projects: this._gate(
          planDetails,
          ud,
          USAGE_PATHS.SUMMARY.PROJECTS_TOTAL,
          PLAN_PATHS.LIMITS.MAX_PROJECTS
        ),
        storage_upload_mb_monthly: this._gate(
          planDetails,
          ud,
          USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB,
          PLAN_PATHS.LIMITS.STORAGE.TOTAL_MONTHLY_UPLOAD
        ),
        team_members: this._gate(
          planDetails,
          ud,
          USAGE_PATHS.SUMMARY.TEAM_MEMBERS_TOTAL,
          PLAN_PATHS.LIMITS.MAX_TEAM_MEMBERS
        ),
        weave_ai_messages_monthly: this._gate(
          planDetails,
          ud,
          USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT,
          PLAN_PATHS.WEAVE_AI.CONFIG.MONTHLY_MESSAGES
        ),
      };

      return res.status(200).json({
        as_of: new Date().toISOString(),
        gates,
        plan: {
          client_type: usageRecord.client_type || null,
          id: planRow.plan_id,
          name: planRow.name,
        },
        plan_details: planDetails,
        usage_period,
        usage_summary,
      });
    } catch (err) {
      console.error("[PlansMeController.getPlanMe]", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = new PlansMeController();
