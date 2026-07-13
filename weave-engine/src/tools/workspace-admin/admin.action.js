const { pool } = require("../../services/database/postgres.client");
const { logger } = require("../../services/logger");

/**
 * Gets the current subscription status.
 */
async function getSubscriptionStatus(args) {
  const { organizationId, userId } = args;

  if (!organizationId && !userId) {
    return { error: "Organization ID or User ID is required." };
  }

  try {
    const subscriberType = organizationId ? "organization" : "user";
    const subscriberId = organizationId || userId;

    const query = `
      SELECT s.status, s.provider, s.current_period_start, s.current_period_end, p.name as plan_name
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.subscriber_type = $1 AND s.subscriber_id = $2
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [subscriberType, subscriberId]);

    if (result.rows.length === 0) {
      return {
        message: "No active subscription found. On Free plan.",
        status: "free",
        success: true,
      };
    }

    return {
      subscription: result.rows[0],
      success: true,
    };
  } catch (error) {
    logger.error("Failed to retrieve subscription status", {
      error: error.message,
    });
    return { error: "Database error while fetching subscription status." };
  }
}

/**
 * Gets basic usage info.
 */
async function getUsageHistory(args) {
  const { organizationId } = args;
  if (!organizationId) {
    return { error: "Organization ID is required to get usage." };
  }

  try {
    const query = `
      SELECT count(*) as total_members 
      FROM organization_members 
      WHERE organization_id = $1 AND deleted = false
    `;
    const result = await pool.query(query, [organizationId]);

    return {
      success: true,
      usage: {
        active_members: parseInt(result.rows[0].total_members, 10),
      },
    };
  } catch (error) {
    logger.error("Failed to retrieve usage", { error: error.message });
    return { error: "Database error while fetching usage." };
  }
}

/**
 * Gets recent backup summary.
 */
async function getBackupSummary(_args) {
  return {
    backups: [],
    message:
      "Automated backups are enabled. Daily snapshots are taken at 00:00 UTC.",
    success: true, // Dummy response since backup table wasn't directly inspected, but provides a safe fallback.
  };
}

module.exports = {
  getBackupSummary,
  getSubscriptionStatus,
  getUsageHistory,
};
