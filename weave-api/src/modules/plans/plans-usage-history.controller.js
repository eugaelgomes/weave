const PlansRepository = require("@/modules/plans/plans.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");

/**
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {number} current
 * @param {number | null} limit
 * @returns {number | null}
 */
function computePercentage(current, limit) {
  if (limit === null || limit <= 0) return null;
  return Number(Math.min((current / limit) * 100, 100).toFixed(2));
}

/**
 * @param {number} current
 * @param {number | null} limit
 * @returns {number | null}
 */
function computeRemaining(current, limit) {
  if (limit === null) return null;
  return Math.max(limit - current, 0);
}

/**
 * @param {number} current
 * @param {number} previous
 * @returns {number | null}
 */
function computeVariation(current, previous) {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

/**
 * @param {Record<string, unknown>} usageDetails
 * @param {Record<string, unknown>} planDetails
 * @returns {Record<string, {used:number,limit:number|null,remaining:number|null,percentage:number|null}>}
 */
function buildUsageMetrics(usageDetails = {}, planDetails = {}) {
  const metric = (usagePath, limitPath) => {
    const used = toNumber(PlanUsageManager.getNestedValue(usageDetails, usagePath));
    const rawLimit = PlanUsageManager.getNestedValue(planDetails, limitPath);
    const limit =
      rawLimit === null || rawLimit === undefined ? null : toNumber(rawLimit);

    return {
      used,
      limit,
      remaining: computeRemaining(used, limit),
      percentage: computePercentage(used, limit),
    };
  };

  return {
    notes_total: metric(
      USAGE_PATHS.SUMMARY.NOTES_TOTAL,
      PLAN_PATHS.LIMITS.MAX_NOTES
    ),
    projects_total: metric(
      USAGE_PATHS.SUMMARY.PROJECTS_TOTAL,
      PLAN_PATHS.LIMITS.MAX_PROJECTS
    ),
    team_members_total: metric(
      USAGE_PATHS.SUMMARY.TEAM_MEMBERS_TOTAL,
      PLAN_PATHS.LIMITS.MAX_TEAM_MEMBERS
    ),
    exports_notes_monthly: metric(
      USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT,
      PLAN_PATHS.LIMITS.EXPORTS.NOTES_MONTHLY
    ),
    backups_monthly: metric(
      USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT,
      PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
    ),
    weave_ai_messages_monthly: metric(
      USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT,
      PLAN_PATHS.WEAVE_AI.CONFIG.MONTHLY_MESSAGES
    ),
    storage_uploaded_mb_monthly: metric(
      USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB,
      PLAN_PATHS.LIMITS.STORAGE.TOTAL_MONTHLY_UPLOAD
    ),
  };
}

/**
 * @param {Record<string, {percentage:number|null}>} metrics
 * @returns {number | null}
 */
function computeTotalPercentage(metrics) {
  const valid = Object.values(metrics)
    .map((item) => item.percentage)
    .filter((value) => value !== null);

  if (!valid.length) return null;
  const sum = valid.reduce((acc, value) => acc + value, 0);
  return Number((sum / valid.length).toFixed(2));
}

/**
 * @param {Record<string, {used:number}>} currentMetrics
 * @param {Record<string, {used:number}> | null} previousMetrics
 * @returns {Record<string, {delta:number,variation_percent:number|null}>}
 */
function buildComparison(currentMetrics, previousMetrics) {
  if (!previousMetrics) return {};

  const comparison = {};
  for (const key of Object.keys(currentMetrics)) {
    const currentUsed = toNumber(currentMetrics[key]?.used);
    const previousUsed = toNumber(previousMetrics[key]?.used);
    comparison[key] = {
      delta: currentUsed - previousUsed,
      variation_percent: computeVariation(currentUsed, previousUsed),
    };
  }

  return comparison;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @param {number} max
 * @returns {number}
 */
function parsePositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function parseDateFilter(value) {
  if (!value || typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

class PlansUsageHistoryController {
  /**
   * GET /plans/usage-history
   *
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */
  async getUsageHistory(req, res) {
    try {
      if (req.user?.isApiCall) {
        res.status(403).json({
          error: "Not available for API token session",
          message:
            "Usage history is only available for web sessions at this time.",
        });
        return;
      }

      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const limit = parsePositiveInt(req.query.limit, 6, 24);
      const offset = parsePositiveInt(req.query.offset, 0, 1000);
      const from = parseDateFilter(req.query.from);
      const to = parseDateFilter(req.query.to);

      const currentUsage = await PlansRepository.getIndividualUserPlanUsage(userId);
      const currentUsageDetails = currentUsage?.usage_details || {};
      const currentPlanDetails = currentUsage?.applied_plan_snapshot || {};
      const currentMetrics = buildUsageMetrics(
        currentUsageDetails,
        currentPlanDetails
      );

      const rawHistory = await PlansRepository.getIndividualUsageHistoryDetailed({
        userId,
        limit: limit + 1,
        offset,
        from,
        to,
      });

      const hasMore = rawHistory.length > limit;
      const historyRows = hasMore ? rawHistory.slice(0, limit) : rawHistory;

      const mappedHistory = historyRows.map((row) => {
        const usageDetails = row.final_usage_details || {};
        const metrics = buildUsageMetrics(usageDetails, {});

        return {
          id: row.id,
          period_start: row.period_start,
          period_end: row.period_end,
          closed_at: row.created_at,
          plan: {
            id: row.plan_id ? String(row.plan_id) : null,
            name: row.plan_name || null,
          },
          metrics,
          totals: {
            notes_created_period: toNumber(row.total_notes_created),
            projects_created_period: toNumber(row.total_projects_created),
            ai_messages_period: toNumber(row.total_ai_messages),
            storage_uploaded_mb_period: toNumber(row.total_storage_mb),
            exports_period: toNumber(row.total_exports),
          },
          percentage_total: computeTotalPercentage(metrics),
        };
      });

      for (let i = 0; i < mappedHistory.length; i += 1) {
        const previous = mappedHistory[i + 1];
        mappedHistory[i].comparison_vs_previous = buildComparison(
          mappedHistory[i].metrics,
          previous ? previous.metrics : null
        );
      }

      res.status(200).json({
        current_period: {
          period_start:
            PlanUsageManager.getNestedValue(
              currentUsageDetails,
              USAGE_PATHS.MONTHLY.PERIOD_START
            ) || null,
          period_end:
            PlanUsageManager.getNestedValue(
              currentUsageDetails,
              USAGE_PATHS.MONTHLY.PERIOD_END
            ) || null,
          plan: {
            id: currentUsage?.plan_id ? String(currentUsage.plan_id) : null,
            name: currentUsage?.plan_name || null,
            client_type: currentUsage?.client_type || null,
          },
          metrics: currentMetrics,
          percentage_total: computeTotalPercentage(currentMetrics),
          as_of: new Date().toISOString(),
        },
        history: mappedHistory,
        pagination: {
          limit,
          offset,
          has_more: hasMore,
          returned: mappedHistory.length,
        },
      });
    } catch (err) {
      console.error("[PlansUsageHistoryController.getUsageHistory]", err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = new PlansUsageHistoryController();
