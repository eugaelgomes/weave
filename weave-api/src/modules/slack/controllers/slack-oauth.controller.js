/* eslint-disable no-console -- OAuth/install diagnostics */
const WebhooksBaseController = require("@/modules/webhooks/controllers/base.controller");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const {
  ORG_PERMISSIONS,
  orgRoleHasPermission,
} = require("@/modules/organizations/organization-role-policy");
const MutateSlackIntegrationsRepository = require("@/modules/slack/repositories/mutate-slack-integrations.repository");
const {
  issueSlackInstallState,
  verifySlackInstallState,
} = require("@/services/integrations/slack/slack-oauth-state");
const {
  buildAuthorizeUrl,
  exchangeOAuthCode,
} = require("@/services/integrations/slack/slack.client");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Slack OAuth install/callback under `/webhooks/slack/*`.
 */
class SlackOauthController extends WebhooksBaseController {
  /**
   * Redirects the authenticated user to Slack OAuth (organization install).
   * `GET /webhooks/slack/install`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async slackInstall(req, res) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (userId === null || userId === undefined) return;

      const organization =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );
      if (!organization?.id) {
        return res.status(404).json({ error: "Organization not found" });
      }

      const role = organization.member_role;
      if (
        !role ||
        !orgRoleHasPermission(role, ORG_PERMISSIONS.MANAGE_GLOBAL_INTEGRATIONS)
      ) {
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient organization permissions",
        });
      }

      const state = issueSlackInstallState({
        organizationId: String(organization.id),
        userId: String(userId),
      });
      const url = buildAuthorizeUrl({ state });
      return res.redirect(url);
    } catch (error) {
      console.error("[Slack Install]", error);
      return res.status(500).json({ error: "Failed to start Slack OAuth" });
    }
  }

  /**
   * Slack OAuth callback — exchanges code, persists installation, redirects to the app.
   * `GET /webhooks/slack/oauth/callback`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async slackOAuthCallback(req, res) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error("[Slack OAuth callback] provider error:", error);
        return res.redirect(
          `${FRONTEND_URL}/app/settings/integrations?slack=error`
        );
      }

      const decoded = verifySlackInstallState(String(state));
      if (!decoded) {
        return res.status(400).json({ error: "Invalid or expired state" });
      }

      const data = await exchangeOAuthCode(String(code));
      if (!data?.ok) {
        console.error("[Slack OAuth callback] oauth.v2.access:", data?.error);
        return res.redirect(
          `${FRONTEND_URL}/app/settings/integrations?slack=error`
        );
      }

      const accessToken = data.access_token;
      const tokenType = data.token_type;
      const botToken =
        tokenType === "bot" ||
        (typeof accessToken === "string" && accessToken.startsWith("xoxb-"))
          ? accessToken
          : null;

      if (!botToken || !data.team?.id) {
        console.error("[Slack OAuth callback] Missing bot token or team id");
        return res.redirect(
          `${FRONTEND_URL}/app/settings/integrations?slack=error`
        );
      }

      await MutateSlackIntegrationsRepository.upsertInstallation({
        appId: data.app_id ? String(data.app_id) : null,
        botAccessToken: botToken,
        botUserId: data.bot_user_id ? String(data.bot_user_id) : null,
        installedByUserId: decoded.userId,
        organizationId: decoded.organizationId,
        scopes: data.scope ? String(data.scope) : null,
        slackTeamId: String(data.team.id),
        slackTeamName: data.team.name ? String(data.team.name) : null,
      });

      return res.redirect(
        `${FRONTEND_URL}/app/settings/integrations?slack=connected`
      );
    } catch (err) {
      console.error("[Slack OAuth callback]", err);
      return res.redirect(
        `${FRONTEND_URL}/app/settings/integrations?slack=error`
      );
    }
  }
}

module.exports = new SlackOauthController();
