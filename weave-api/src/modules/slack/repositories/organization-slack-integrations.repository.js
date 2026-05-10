const { executeQuery, rowCount } = require("@/database/connection");

/**
 * Persistence for Slack OAuth installations (`organization_slack_integrations`).
 */
class OrganizationSlackIntegrationsRepository {
  /**
   * @param {string} organizationId
   * @returns {Promise<object|undefined>}
   */
  async findActiveByOrganizationId(organizationId) {
    const rows = await executeQuery(
      `SELECT
         id,
         organization_id,
         slack_team_id,
         slack_team_name,
         bot_user_id,
         app_id,
         scopes,
         bot_access_token,
         installed_by_user_id,
         default_channel_id,
         default_channel_name,
         is_active,
         deleted,
         created_at,
         updated_at
       FROM organization_slack_integrations
       WHERE organization_id = $1::uuid AND deleted = false
       LIMIT 1`,
      [organizationId]
    );
    return rows[0];
  }

  /**
   * Upserts installation for an organization (one row per org).
   *
   * @param {object} params
   * @param {string} params.organizationId
   * @param {string} params.slackTeamId
   * @param {string|null} params.slackTeamName
   * @param {string|null} params.botUserId
   * @param {string|null} params.appId
   * @param {string|null} params.scopes
   * @param {string} params.botAccessToken
   * @param {string|null} params.installedByUserId
   * @returns {Promise<object>}
   */
  async upsertInstallation({
    organizationId,
    slackTeamId,
    slackTeamName,
    botUserId,
    appId,
    scopes,
    botAccessToken,
    installedByUserId,
  }) {
    const rows = await executeQuery(
      `INSERT INTO organization_slack_integrations (
         organization_id,
         slack_team_id,
         slack_team_name,
         bot_user_id,
         app_id,
         scopes,
         bot_access_token,
         installed_by_user_id,
         is_active,
         deleted,
         deleted_at
       )
       VALUES (
         $1::uuid,
         $2,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8::uuid,
         true,
         false,
         NULL
       )
       ON CONFLICT (organization_id)
       DO UPDATE SET
         slack_team_id = EXCLUDED.slack_team_id,
         slack_team_name = EXCLUDED.slack_team_name,
         bot_user_id = EXCLUDED.bot_user_id,
         app_id = EXCLUDED.app_id,
         scopes = EXCLUDED.scopes,
         bot_access_token = EXCLUDED.bot_access_token,
         installed_by_user_id = EXCLUDED.installed_by_user_id,
         is_active = true,
         deleted = false,
         deleted_at = NULL,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        organizationId,
        slackTeamId,
        slackTeamName,
        botUserId,
        appId,
        scopes,
        botAccessToken,
        installedByUserId,
      ]
    );
    return rows[0];
  }

  /**
   * @param {string} organizationId
   * @param {string|null} channelId
   * @param {string|null} channelName
   */
  async updateDefaultChannel(organizationId, channelId, channelName) {
    await rowCount(
      `UPDATE organization_slack_integrations
       SET default_channel_id = $2,
           default_channel_name = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1::uuid AND deleted = false`,
      [organizationId, channelId, channelName]
    );
  }

  /**
   * Soft-delete integration for an organization.
   * @param {string} organizationId
   */
  async softDeleteByOrganizationId(organizationId) {
    await rowCount(
      `UPDATE organization_slack_integrations
       SET is_active = false,
           deleted = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE organization_id = $1::uuid`,
      [organizationId]
    );
  }
}

module.exports = new OrganizationSlackIntegrationsRepository();
