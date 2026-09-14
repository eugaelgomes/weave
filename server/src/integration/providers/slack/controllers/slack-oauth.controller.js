const WorkspacesBaseController = require("@/modules/workspaces/controllers/base-controller");

const MutateSlackIntegrationsRepository = require("@/integration/providers/slack/repositories/mutate-slack-integrations.repository");
const {
  issueSlackInstallState,
  verifySlackInstallState,
} = require("@/integration/providers/slack/utils/slack-oauth-state.util");
const { SlackClient } = require("@/integration/providers/slack/slack.client");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Slack OAuth install/callback under `/integrations/slack/*`.
 */
class SlackOauthController extends WorkspacesBaseController {
  /**
   * Redirects the authenticated user to Slack OAuth (workspace install).
   * `GET /integrations/slack/install`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async slackInstall(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (userId === null || userId === undefined) return;

      const workspace = await this._getUserWorkspace(userId, req.user?.workspace_public_id);
      if (!workspace?.id) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (
        !this._workspaceRoleHasPermission(
          workspace,
          this._workspacePermissions.MANAGE_WORKSPACE_LIFECYCLE
        )
      ) {
        return res.status(403).json({
          code: "WORKSPACE_FORBIDDEN",
          error: "Insufficient workspace permissions",
        });
      }

      const state = issueSlackInstallState({
        userId: String(userId),
        workspaceId: String(workspace.id),
      });
      const url = SlackClient.buildAuthorizeUrl({ state });
      return res.redirect(url);
    } catch (error) {
      console.error("[Slack Install]", error);
      return res.status(500).json({ error: "Failed to start Slack OAuth" });
    }
  }

  /**
   * Slack OAuth callback — exchanges code, persists installation, redirects to the app.
   * `GET /integrations/slack/oauth/callback`
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async slackOAuthCallback(req, res) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        console.error("[Slack OAuth callback] provider error:", error);
        return res.redirect(`${FRONTEND_URL}/app/settings/integrations?slack=error`);
      }

      const decoded = verifySlackInstallState(String(state));
      if (!decoded) {
        return res.status(400).json({ error: "Invalid or expired state" });
      }

      const data = await SlackClient.exchangeOAuthCode(String(code));
      if (!data?.ok) {
        console.error("[Slack OAuth callback] oauth.v2.access:", data?.error);
        return res.redirect(`${FRONTEND_URL}/app/settings/integrations?slack=error`);
      }

      const accessToken = data.access_token;
      const tokenType = data.token_type;
      const botToken =
        tokenType === "bot" || (typeof accessToken === "string" && accessToken.startsWith("xoxb-"))
          ? accessToken
          : null;

      if (!botToken || !data.team?.id) {
        console.error("[Slack OAuth callback] Missing bot token or team id");
        return res.redirect(`${FRONTEND_URL}/app/settings/integrations?slack=error`);
      }

      await MutateSlackIntegrationsRepository.upsertInstallation({
        appId: data.app_id ? String(data.app_id) : null,
        botAccessToken: botToken,
        botUserId: data.bot_user_id ? String(data.bot_user_id) : null,
        installedByUserId: decoded.userId,
        scopes: data.scope ? String(data.scope) : null,
        slackTeamId: String(data.team.id),
        slackTeamName: data.team.name ? String(data.team.name) : null,
        workspaceId: decoded.workspaceId,
      });

      return res.redirect(`${FRONTEND_URL}/app/settings/integrations?slack=connected`);
    } catch (err) {
      console.error("[Slack OAuth callback]", err);
      return res.redirect(`${FRONTEND_URL}/app/settings/integrations?slack=error`);
    }
  }
}

module.exports = new SlackOauthController();
