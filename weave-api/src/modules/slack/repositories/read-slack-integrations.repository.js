const BaseRepository = require("./base.repository");

/**
 * Read queries for Slack OAuth installations (`organization_slack_integrations`).
 */
class ReadSlackIntegrationsRepository extends BaseRepository {
  /**
   * @param {string} organizationId
   * @returns {Promise<object|undefined>}
   */
  async findActiveByOrganizationId(organizationId) {
    const rows = await this.executeQuery(
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
}

module.exports = new ReadSlackIntegrationsRepository();
