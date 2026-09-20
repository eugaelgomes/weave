const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const axios = require("axios");
const { z } = require("zod");

const AuthBaseController = require("../base.controller");
const GoogleOauthRepository = require("../../repositories/oauth/google.repository");
const AuthRepository = require("../../repositories/auth.repository");

const oauthState = require("../../utils/oauth-state.util");
const { buildJwtPayload } = require("../../schemas/session.schema");
const { establishAuthenticatedSession } = require("../../utils/session-lifecycle.util");
const { getOauthConfig } = require("../../config/oauth.config");

const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;

/**
 * Google OAuth2 flow (redirect and callback).
 */
class GoogleOauthController extends AuthBaseController {
  async googleAuth(req, res) {
    const { google } = getOauthConfig();

    if (!google?.enabled || !google?.client_id) {
      return res.status(404).json({ error: "Google authentication is not configured." });
    }

    const redirectUri = google.redirect_uri;
    const state = issueOauthState({ provider: "google", req, res });

    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${google.client_id}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=openid%20email%20profile` +
      `&prompt=select_account&state=${encodeURIComponent(state)}`;

    res.redirect(url);
  }

  async googleCallback(req, res) {
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
    let phase = "configuration";

    const googleUserSchema = z.object({
      email: z.string().email(),
      id: z.string().min(1),
      name: z.string().optional(),
      picture: z.string().url().optional(),
    });

    try {
      const { google } = getOauthConfig();

      if (!google?.enabled || !google?.client_id || !google?.client_secret) {
        throw new Error("Google authentication is not correctly configured.");
      }

      const { code, error, state } = req.query;

      const isValidOauthState = consumeAndValidateOauthState({
        provider: "google",
        req,
        res,
        state,
      });
      if (!isValidOauthState) {
        return res.redirect(`${frontendURL}/?error=invalid_oauth_state`);
      }

      if (error) {
        console.error("Google authorization error:", error);
        return res.redirect(`${frontendURL}/?error=authorization_denied`);
      }

      if (!code) {
        console.error("Authorization code not found");
        return res.redirect(`${frontendURL}/?error=missing_auth_code`);
      }

      const redirectUri = google.redirect_uri;
      const params = new URLSearchParams();
      params.append("client_id", google.client_id);
      params.append("client_secret", google.client_secret);
      params.append("code", code);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", redirectUri);

      phase = "token";
      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new Error("Access token not received from Google.");
      }

      phase = "profile";
      const userResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
      );
      const googleUserResult = googleUserSchema.safeParse(userResponse.data);
      if (!googleUserResult.success) {
        throw new Error("Incomplete or invalid user data received from Google.");
      }
      const googleUser = googleUserResult.data;

      phase = "provider_account_lookup";
      let user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);

      if (!user) {
        phase = "email_account_lookup";
        const existingUser = await AuthRepository.findUserByEmail(googleUser.email);

        if (existingUser) {
          phase = "account_link";
          await GoogleOauthRepository.updateUserWithGoogle(
            existingUser.user_id,
            googleUser.id,
            googleUser.picture,
            googleUser.name
          );
        } else {
          phase = "domain_policy";
          const emailDomain = googleUser.email.split("@")[1];
          if (emailDomain) {
            const isRestricted = await settingsRepository.isDomainRestricted(emailDomain);

            if (isRestricted) {
              throw new Error(
                "This email belongs to a restricted corporate domain. You must be invited."
              );
            }
          }

          phase = "account_create";
          await GoogleOauthRepository.createUserWithGoogle(
            googleUser.id,
            googleUser.name,
            googleUser.email,
            googleUser.picture
          );
        }

        phase = "provider_account_reload";
        user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);

        if (!user) {
          throw new Error("Failed to create or retrieve user.");
        }
      }

      phase = "session";
      const workspace = this._normalizeWorkspace(user.workspace);
      const defaultTeam = this._normalizeDefaultTeam(user.default_team);

      const payload = buildJwtPayload(user, workspace, defaultTeam);

      phase = "session_persistence";
      try {
        await establishAuthenticatedSession(req, payload, user.user_id);
      } catch (err) {
        console.error("Google OAuth session save error:", {
          code: err.code || null,
          constraint: err.constraint || err.meta?.target || null,
          message: err.message,
          phase,
        });
        return res.redirect(
          `${frontendURL}/auth/?error=auth_failed&provider=google&phase=session_persistence`
        );
      }
      return res.redirect(`${frontendURL}${this._getPostAuthenticationPath(user)}`);
    } catch (error) {
      console.error("Google OAuth callback error:", {
        code: error.code || null,
        constraint: error.constraint || error.meta?.target || null,
        message: error.message,
        phase,
      });
      return res.redirect(
        `${frontendURL}/auth/?error=auth_failed&provider=google&phase=${encodeURIComponent(phase)}`
      );
    }
  }
}

module.exports = new GoogleOauthController();
