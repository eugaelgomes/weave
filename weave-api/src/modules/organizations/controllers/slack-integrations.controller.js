/* eslint-disable no-console -- integration errors */
const OrganizationsBaseController = require("@/modules/organizations/controllers/base-controller");
const OrganizationSlackIntegrationsRepository = require("@/modules/slack/repositories/organization-slack-integrations.repository");
const {
  conversationsInfo,
  authRevoke,
} = require("@/services/slack/slack.client");

/**
 * Slack integration settings for the active organization.
 */
class SlackIntegrationsController extends OrganizationsBaseController {
  /**
   * `GET /organizations/integrations/slack`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getSlackIntegration(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (
        !this._ensureOrgPermission(
          organization,
          this._orgPermissions.MANAGE_GLOBAL_INTEGRATIONS,
          res
        )
      ) {
        return;
      }

      const row =
        await OrganizationSlackIntegrationsRepository.findActiveByOrganizationId(
          String(organization.id)
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
   * `PUT /organizations/integrations/slack/default-channel`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async setDefaultChannel(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (
        !this._ensureOrgPermission(
          organization,
          this._orgPermissions.MANAGE_GLOBAL_INTEGRATIONS,
          res
        )
      ) {
        return;
      }

      const channelId =
        req.body?.channel_id ??
        req.body?.channelId ??
        req.body?.default_channel_id;
      if (!channelId || typeof channelId !== "string") {
        return res.status(400).json({ error: "channel_id is required" });
      }

      const integration =
        await OrganizationSlackIntegrationsRepository.findActiveByOrganizationId(
          String(organization.id)
        );
      if (!integration?.bot_access_token) {
        return res.status(400).json({ error: "Slack is not connected for this organization" });
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

      const channelName = info.channel.name
        ? String(info.channel.name)
        : null;

      await OrganizationSlackIntegrationsRepository.updateDefaultChannel(
        String(organization.id),
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
   * `DELETE /organizations/integrations/slack`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async disconnectSlack(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (
        !this._ensureOrgPermission(
          organization,
          this._orgPermissions.MANAGE_GLOBAL_INTEGRATIONS,
          res
        )
      ) {
        return;
      }

      const integration =
        await OrganizationSlackIntegrationsRepository.findActiveByOrganizationId(
          String(organization.id)
        );
      if (integration?.bot_access_token) {
        try {
          await authRevoke(integration.bot_access_token);
        } catch (revokeErr) {
          console.error("[disconnectSlack] auth.revoke:", revokeErr);
        }
      }

      await OrganizationSlackIntegrationsRepository.softDeleteByOrganizationId(
        String(organization.id)
      );

      return res.status(204).send();
    } catch (error) {
      console.error("[disconnectSlack]", error);
      return res.status(500).json({ error: "Failed to disconnect Slack" });
    }
  }
}

module.exports = new SlackIntegrationsController();
