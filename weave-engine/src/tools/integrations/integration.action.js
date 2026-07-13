const { pool } = require("../../services/database/postgres.client");
const { logger } = require("../../services/logger");

/**
 * Gets the status of workspace integrations (Slack, Google Calendar).
 */
async function getIntegrationsStatus(args) {
  const { organizationId, userId } = args;

  if (!organizationId && !userId) {
    return { error: "Organization ID or User ID is required." };
  }

  try {
    const integrations = {};

    // Slack
    if (organizationId) {
      const slackQuery = `
        SELECT slack_team_name, is_active, created_at, default_channel_name
        FROM organization_slack_integrations
        WHERE organization_id = $1 AND deleted = false
        LIMIT 1
      `;
      const slackResult = await pool.query(slackQuery, [organizationId]);
      if (slackResult.rows.length > 0) {
        integrations.slack = slackResult.rows[0];
      } else {
        integrations.slack = { is_active: false, status: "Not Connected" };
      }
    }

    // Google Calendar Webhooks
    const calendarQuery = `
      SELECT channel_id, resource_id, expiration, created_at
      FROM google_calendar_webhooks
      WHERE user_id = $1
    `;
    const calendarResult = await pool.query(calendarQuery, [userId]);

    integrations.google_calendar_webhooks = {
      active_watches: calendarResult.rows.length,
      watches: calendarResult.rows.map((r) => ({
        channel_id: r.channel_id,
        created_at: r.created_at,
        expiration: r.expiration,
      })),
    };

    return {
      integrations,
      message: "Integrations status retrieved successfully.",
      success: true,
    };
  } catch (error) {
    logger.error("Failed to retrieve integrations status", {
      error: error.message,
      organizationId,
      userId,
    });
    return { error: "Database error while fetching integrations status." };
  }
}

module.exports = {
  getIntegrationsStatus,
};
