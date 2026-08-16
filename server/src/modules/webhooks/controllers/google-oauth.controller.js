const googleService = require("@/modules/calendar/utils/google-calendar.util");
const GoogleOauthTokensRepository = require("@/modules/webhooks/repositories/google-oauth-tokens.repository");
const GoogleCalendarController = require("@/modules/webhooks/controllers/google-calendar.controller");
const WebhooksBaseController = require("@/modules/webhooks/controllers/base.controller");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Google Calendar OAuth2: `GET /api/v1/webhooks/google/auth` and callback
 * `GET /api/v1/webhooks/google/callback`.
 *
 * The `redirect_uri` is hardcoded in `@/modules/calendar/services/google-calendar.service.js`:
 * production `https://apis.weavenotes.app/api/v1/webhooks/google/callback`,
 * dev `http://localhost:8080/api/v1/webhooks/google/callback`.
 */
class GoogleOauthController extends WebhooksBaseController {
  /**
   * Redirects the user to the Google OAuth2 consent screen.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async googleAuth(req, res) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (userId === null || userId === undefined) return;

      const url = googleService.getAuthUrl(userId);
      res.redirect(url);
    } catch (error) {
      console.error("[Google Auth]", error);
      res.status(500).json({ error: "Falha ao gerar URL de autenticação Google" });
    }
  }

  /**
   * Google OAuth2 callback. Exchanges authorization code for tokens,
   * persists them in the database, and registers the Calendar webhook.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async googleCallback(req, res) {
    try {
      const { code, state } = req.query;

      const { userId } = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      if (!userId) {
        return res.status(400).json({ error: "userId não encontrado no state" });
      }

      const tokens = await googleService.getTokens(code);
      const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      await GoogleOauthTokensRepository.saveGoogleTokens(
        userId,
        tokens.access_token,
        tokens.refresh_token,
        expiresAt
      );

      await GoogleCalendarController.registerCalendarWatch(userId, tokens);

      res.redirect(`${FRONTEND_URL}/app/settings?google_calendar=connected`);
    } catch (error) {
      console.error("[Google Callback]", error);
      res.redirect(`${FRONTEND_URL}/app/settings?google_calendar=error`);
    }
  }
}

module.exports = new GoogleOauthController();
