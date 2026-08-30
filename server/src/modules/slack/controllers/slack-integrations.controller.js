const OrganizationsBaseController = require("@/modules/workspaces/controllers/base-controller");
const ReadSlackIntegrationsRepository = require("@/modules/slack/repositories/read-slack-integrations.repository");
const MutateSlackIntegrationsRepository = require("@/modules/slack/repositories/mutate-slack-integrations.repository");
const { conversationsInfo, authRevoke } = require("@/modules/slack/utils/slack-client.util");

/**
 * Slack integration settings for the active workspace.
 */
class SlackIntegrationsController extends OrganizationsBaseController {
  /**
   * `GET /workspaces/integrations/slack`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getSlackIntegration(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (
        !this._ensureOrgPermission(
          workspace,
          this._orgPermissions.MANAGE_GLOBAL_INTEGRATIONS,
          res
        )
      ) {
        return;
      }

      const row = await ReadSlackIntegrationsRepository.findActiveByOrganizationId(
        String(workspace.id)
      );

      if (!row) {
        return res.status(200).json({
          connected: false,
          default_channel_id: null,
          default_channel_name: null,
          scopes: null,
          slack_team_id: null,
          slack_team_name: null,
        });
      }

      return res.status(200).json({
        connected: true,
        default_channel_id: row.default_channel_id,
        default_channel_name: row.default_channel_name,
        scopes: row.scopes,
        slack_team_id: row.slack_team_id,
        slack_team_name: row.slack_team_name,
      });
    } catch (error) {
      console.error("[getSlackIntegration]", error);
      return res.status(500).json({ error: "Failed to load Slack integration" });
    }
  }

  /**
   * `PUT /workspaces/integrations/slack/default-channel`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async setDefaultChannel(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (
        !this._ensureOrgPermission(
          workspace,
          this._orgPermissions.MANAGE_GLOBAL_INTEGRATIONS,
          res
        )
      ) {
        return;
      }

      const channelId = req.body?.channel_id ?? req.body?.channelId ?? req.body?.default_channel_id;

      const integration = await ReadSlackIntegrationsRepository.findActiveByOrganizationId(
        String(workspace.id)
      );
      if (!integration?.bot_access_token) {
        return res.status(400).json({ error: "Slack is not connected for this workspace" });
      }

      const info = await conversationsInfo({
        channel: channelId.trim(),
        token: integration.bot_access_token,
      });
      if (!info?.ok || !info.channel) {
        return res.status(400).json({
          error: "Unable to access Slack channel. Check the channel ID and bot scopes.",
          slack_error: info?.error,
        });
      }

      const channelName = info.channel.name ? String(info.channel.name) : null;

      await MutateSlackIntegrationsRepository.updateDefaultChannel(
        String(workspace.id),
        channelId.trim(),
        channelName
      );

      return res.status(200).json({
        default_channel_id: channelId.trim(),
        default_channel_name: channelName,
      });
    } catch (error) {
      console.error("[setDefaultChannel]", error);
      return res.status(500).json({ error: "Failed to update default Slack channel" });
    }
  }

  /**
   * `DELETE /workspaces/integrations/slack`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async disconnectSlack(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (
        !this._ensureOrgPermission(
          workspace,
          this._orgPermissions.MANAGE_GLOBAL_INTEGRATIONS,
          res
        )
      ) {
        return;
      }

      const integration = await ReadSlackIntegrationsRepository.findActiveByOrganizationId(
        String(workspace.id)
      );
      if (integration?.bot_access_token) {
        try {
          await authRevoke(integration.bot_access_token);
        } catch (revokeErr) {
          console.error("[disconnectSlack] auth.revoke:", revokeErr);
        }
      }

      await MutateSlackIntegrationsRepository.softDeleteByOrganizationId(String(workspace.id));

      return res.status(204).send();
    } catch (error) {
      console.error("[disconnectSlack]", error);
      return res.status(500).json({ error: "Failed to disconnect Slack" });
    }
  }
}

module.exports = new SlackIntegrationsController();
