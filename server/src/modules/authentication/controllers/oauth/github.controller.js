const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const axios = require("axios");
const { z } = require("zod");

const AuthBaseController = require("../base.controller");
const GithubOauthRepository = require("../../repositories/oauth/github.repository");
const AuthRepository = require("../../repositories/auth.repository");

const OrganizationsRepository = require("@/modules/workspaces/repositories/base.repository");
const oauthState = require("../../utils/oauth-state.util");
const { buildJwtPayload } = require("../../schemas/session.schema");
const systemSettings = require("@/modules/workspaces/services/system-settings.cache");
const { getBackendUrl } = require("@/utils/url.util");

const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;

/**
 * GitHub OAuth2 flow (redirect and callback).
 */
class GithubOauthController extends AuthBaseController {
  async githubAuth(req, res) {
    const oauth = await systemSettings.getOauthConfig();
    const github = oauth?.github;

    if (!github?.enabled || !github?.client_id) {
      return res.status(404).json({ error: "GitHub authentication is not configured." });
    }

    const redirectUri = `${getBackendUrl()}/api/v1/auth/oauth/github/callback`;
    const state = issueOauthState({ provider: "github", req, res });
    const url = `https://github.com/login/oauth/authorize?client_id=${github.client_id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${encodeURIComponent(state)}`;

    res.redirect(url);
  }

  async githubCallback(req, res) {
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
      const oauth = await systemSettings.getOauthConfig();
      const github = oauth?.github;

      if (!github?.enabled || !github?.client_id || !github?.client_secret) {
        throw new Error("GitHub authentication is not correctly configured.");
      }

      const { code, error, state } = req.query;
      const isValidOauthState = consumeAndValidateOauthState({
        provider: "github",
        req,
        res,
        state,
      });
      if (!isValidOauthState) {
        return res.redirect(`${frontendURL}/?error=invalid_oauth_state`);
      }

      if (error) {
        console.error("Error during GitHub authentication", error);
        return res.redirect(`${frontendURL}/?error=authorization_denied`);
      }

      if (!code) {
        console.error("GitHub authorization code not found");
        return res.redirect(`${frontendURL}/?error=missing_auth_code`);
      }

      const redirectUri = `${getBackendUrl()}/api/v1/auth/oauth/github/callback`;

      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: github.client_id,
          client_secret: github.client_secret,
          code: code,
          redirect_uri: redirectUri,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new Error("Access token not received from GitHub.");
      }

      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "Weave-Notes",
        },
      });
      const githubUserSchema = z.object({
        avatar_url: z.string().url().optional(),
        id: z.number().int().positive(),
        login: z.string().min(1),
        name: z.string().nullable().optional(),
      });
      const githubEmailSchema = z.object({
        email: z.string().email(),
        primary: z.boolean(),
        verified: z.boolean(),
      });

      const githubUserResult = githubUserSchema.safeParse(userResponse.data);
      if (!githubUserResult.success) {
        throw new Error("Incomplete or invalid user data received from GitHub.");
      }
      const githubUser = githubUserResult.data;

      const emailsResponse = await axios.get("https://api.github.com/user/emails", {
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "Weave-Notes-App",
        },
      });

      const rawEmails = Array.isArray(emailsResponse.data) ? emailsResponse.data : [];
      const emails = rawEmails
        .map((e) => githubEmailSchema.safeParse(e))
        .filter((r) => r.success)
        .map((r) => r.data);

      const primaryEmailObj =
        emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];

      const userEmail = primaryEmailObj?.email;
      const githubId = String(githubUser.id);

      if (!userEmail) {
        throw new Error("No verified email found for this GitHub account.");
      }

      let user = await GithubOauthRepository.findUserByGithubId(githubId);

      if (!user) {
        const existingUser = await AuthRepository.findUserByEmail(userEmail);

        if (existingUser) {
          await GithubOauthRepository.updateUserWithGithub(
            existingUser.user_id,
            githubId,
            githubUser.avatar_url
          );
        } else {
          const emailDomain = userEmail.split("@")[1];
          if (emailDomain) {
            const isRestricted = await settingsRepository.isDomainRestricted(emailDomain);

            if (isRestricted) {
              throw new Error(
                "This email belongs to a restricted corporate domain. You must be invited."
              );
            }
          }
          const generatedRandomUsername = (username) => {
            const cleanUsername = (username || `github_user_${githubUser.id}`)
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "")
              .slice(0, 14);
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            return `${cleanUsername}_${randomSuffix}`;
          };

          await GithubOauthRepository.createUserWithGithub(
            githubId,
            githubUser.name || githubUser.login,
            generatedRandomUsername(githubUser.login),
            userEmail,
            githubUser.avatar_url
          );
        }

        user = await GithubOauthRepository.findUserByGithubId(githubId);

        if (!user) {
          throw new Error("Failed to create or retrieve user.");
        }

        if (!user.workspace) {
          await OrganizationsRepository.autoProvisionPersonalWorkspace(
            user.user_id,
            githubUser.name || githubUser.login
          );
          user = await GithubOauthRepository.findUserByGithubId(githubId);
        }
      }

      const workspace = this._normalizeWorkspace(user.workspace);
      const defaultTeam = this._normalizeDefaultTeam(user.default_team);

      const payload = buildJwtPayload(user, workspace, defaultTeam);

      req.session.user = payload;
      req.session.userId = user.user_id;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error during GitHub OAuth:", err);
          return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
        }
        return res.redirect(`${frontendURL}/chat/?auth=success`);
      });
    } catch (error) {
      console.error("GitHub OAuth callback error:", error.message);
      res.redirect(`${frontendURL}/auth/?error=auth_failed`);
    }
  }
}

module.exports = new GithubOauthController();
