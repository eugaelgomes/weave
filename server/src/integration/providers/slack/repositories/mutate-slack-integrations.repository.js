const BaseRepository = require("./base.repository");

/**
 * Mutation queries for Slack OAuth installations (`workspace_slack_integrations`).
 */
class MutateSlackIntegrationsRepository extends BaseRepository {
  /**
   * Upserts installation for an workspace (one row per org).
   *
   * @param {object} params
   * @param {string} params.workspaceId
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
    workspaceId,
    slackTeamId,
    slackTeamName,
    botUserId,
    appId,
    scopes,
    botAccessToken,
    installedByUserId,
  }) {
    const rows = await this.executeQuery(
      `INSERT INTO workspace_slack_integrations (
         workspace_id,
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
       ON CONFLICT (workspace_id)
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
        workspaceId,
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
   * @param {string} workspaceId
   * @param {string|null} channelId
   * @param {string|null} channelName
   */
  async updateDefaultChannel(workspaceId, channelId, channelName) {
    await this.rowCount(
      `UPDATE workspace_slack_integrations
       SET default_channel_id = $2,
           default_channel_name = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1::uuid AND deleted = false`,
      [workspaceId, channelId, channelName]
    );
  }

  /**
   * Soft-delete integration for an workspace.
   * @param {string} workspaceId
   */
  async softDeleteByWorkspaceId(workspaceId) {
    await this.rowCount(
      `UPDATE workspace_slack_integrations
       SET is_active = false,
           deleted = true,
           updated_at = CURRENT_TIMESTAMP
       WHERE workspace_id = $1::uuid`,
      [workspaceId]
    );
  }
}

module.exports = new MutateSlackIntegrationsRepository();
