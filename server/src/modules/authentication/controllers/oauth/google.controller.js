const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const axios = require("axios");
const { z } = require("zod");

const AuthBaseController = require("../base.controller");
const GoogleOauthRepository = require("../../repositories/oauth/google.repository");
const AuthRepository = require("../../repositories/auth.repository");

const OrganizationsRepository = require("@/modules/workspaces/repositories/workspaces.repository");
const oauthState = require("../../utils/oauth-state.util");
const { buildJwtPayload } = require("../../schemas/session.schema");
const systemSettings = require("@/modules/workspaces/services/system-settings.cache");
const { getBackendUrl } = require("@/utils/url.util");

const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;

/**
 * Google OAuth2 flow (redirect and callback).
 */
class GoogleOauthController extends AuthBaseController {
  async googleAuth(req, res) {
    const oauth = await systemSettings.getOauthConfig();
    const google = oauth?.google;

    if (!google?.enabled || !google?.client_id) {
      return res.status(404).json({ error: "Google authentication is not configured." });
    }

    const redirectUri = `${getBackendUrl()}/api/v1/auth/oauth/google/callback`;
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

    const googleUserSchema = z.object({
      email: z.string().email(),
      id: z.string().min(1),
      name: z.string().optional(),
      picture: z.string().url().optional(),
    });

    try {
      const oauth = await systemSettings.getOauthConfig();
      const google = oauth?.google;

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

      const redirectUri = `${getBackendUrl()}/api/v1/auth/oauth/google/callback`;
      const params = new URLSearchParams();
      params.append("client_id", google.client_id);
      params.append("client_secret", google.client_secret);
      params.append("code", code);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", redirectUri);

      const tokenResponse = await axios.post("https://oauth2.googleapis.com/token", params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new Error("Access token not received from Google.");
      }

      const userResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
      );
      const googleUserResult = googleUserSchema.safeParse(userResponse.data);
      if (!googleUserResult.success) {
        throw new Error("Incomplete or invalid user data received from Google.");
      }
      const googleUser = googleUserResult.data;

      let user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);

      if (!user) {
        const existingUser = await AuthRepository.findUserByEmail(googleUser.email);

        if (existingUser) {
          await GoogleOauthRepository.updateUserWithGoogle(
            existingUser.user_id,
            googleUser.id,
            googleUser.picture
          );
        } else {
          const emailDomain = googleUser.email.split("@")[1];
          if (emailDomain) {
            const isRestricted = await settingsRepository.isDomainRestricted(emailDomain);

            if (isRestricted) {
              throw new Error(
                "This email belongs to a restricted corporate domain. You must be invited."
              );
            }
          }

          await GoogleOauthRepository.createUserWithGoogle(
            googleUser.id,
            googleUser.name,
            googleUser.email,
            googleUser.picture
          );
        }

        user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);

        if (!user) {
          throw new Error("Failed to create or retrieve user.");
        }

        if (!user.workspace) {
          await OrganizationsRepository.autoProvisionPersonalWorkspace(
            user.user_id,
            googleUser.name || googleUser.email.split("@")[0]
          );
          user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);
        }
      }

      const workspace = this._normalizeWorkspace(user.workspace);
      const defaultTeam = this._normalizeDefaultTeam(user.default_team);

      const payload = buildJwtPayload(user, workspace, defaultTeam);

      req.session.user = payload;
      req.session.userId = user.user_id;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error during Google OAuth:", err);
          return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
        }
        return res.redirect(`${frontendURL}/chat/?auth=success`);
      });
    } catch (error) {
      console.error("Google OAuth callback error:", error.message);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendURL}/auth/?error=auth_failed`);
    }
  }
}

module.exports = new GoogleOauthController();
