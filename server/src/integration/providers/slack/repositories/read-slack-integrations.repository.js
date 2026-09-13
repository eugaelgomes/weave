const BaseRepository = require("./base.repository");

/**
 * Read queries for Slack OAuth installations (`workspace_slack_integrations`).
 */
class ReadSlackIntegrationsRepository extends BaseRepository {
  /**
   * @param {string} workspaceId
   * @returns {Promise<object|undefined>}
   */
  async findActiveByOrganizationId(workspaceId) {
    const rows = await this.executeQuery(
      `SELECT
         id,
         workspace_id,
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
       FROM workspace_slack_integrations
       WHERE workspace_id = $1::uuid AND deleted = false
       LIMIT 1`,
      [workspaceId]
    );
    return rows[0];
  }
}

module.exports = new ReadSlackIntegrationsRepository();
