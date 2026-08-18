const axios = require("axios");
const { z } = require("zod");
const crypto = require("crypto");

const AuthBaseController = require("./base.controller");
const GithubOauthRepository = require("@/modules/authentication/repositories/github-oauth.repository");
const FindUserRepository = require("@/modules/authentication/repositories/find-user.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const oauthState = require("@/modules/authentication/oauth-state");
const { buildJwtPayload } = require("@/modules/authentication/schemas/jwt-payload.schema");

const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;

/** Fixed callback; register the same URL in the GitHub OAuth App. */
const GITHUB_OAUTH_REDIRECT_URI =
  process.env.NODE_ENV === "production"
    ? "https://apis.weavenotes.app/api/v1/auth/signin/sso/github/callback"
    : "http://localhost:8080/api/v1/auth/signin/sso/github/callback";

/**
 * GitHub OAuth2 flow (redirect and callback).
 */
class GithubOauthController extends AuthBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async githubAuth(req, res) {
    const state = issueOauthState({ provider: "github", req, res });
    const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_OAUTH_REDIRECT_URI)}&scope=user:email&state=${encodeURIComponent(state)}`;

    res.redirect(githubOAuthURL);
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async githubCallback(req, res) {
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
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

      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: GITHUB_OAUTH_REDIRECT_URI,
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
      // Schema for GitHub's /user endpoint
      const githubUserSchema = z.object({
        avatar_url: z.string().url().optional(),
        id: z.number().int().positive(),
        login: z.string().min(1),
        name: z.string().nullable().optional(),
      });

      // Schema for a single email entry from GitHub's /user/emails endpoint
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
        const existingUser = await FindUserRepository.findUserByEmail(userEmail);
        let existingPendingUser = null;

        if (existingUser && existingUser.status === "PENDING_INVITE") {
           existingPendingUser = existingUser;
        }

        if (existingUser) {
          await GithubOauthRepository.updateUserWithGithub(
            existingUser.user_id,
            githubId,
            githubUser.avatar_url
          );
          user = await GithubOauthRepository.findUserByGithubId(githubId);
        } else {
          const emailDomain = userEmail.split("@")[1];
          if (emailDomain) {
            const domainInfo = await OrganizationDomainsRepository.findActiveByDomain(emailDomain);

            if (domainInfo && (domainInfo.status === "VERIFIED" || domainInfo.status === "PENDING")) {
              throw new Error("This email belongs to a restricted corporate domain. You must be invited.");
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

          const newUser = await GithubOauthRepository.createUserWithGithub(
            githubId,
            githubUser.name || githubUser.login,
            generatedRandomUsername(githubUser.login),
            userEmail,
            githubUser.avatar_url
          );

          const hasInvite = existingPendingUser !== null;
          if (!hasInvite) {
            const orgName = `Workspace de ${githubUser.name || githubUser.login}`;
            const uniqueName = `workspace-${crypto.randomBytes(4).toString("hex")}`;
            await OrganizationsRepository.createOrgs(
              newUser.user_id,
              orgName,
              uniqueName,
              null,
              null,
              null,
              "UTC",
              "en",
              null,
              {}
            );
          }

          user = await GithubOauthRepository.findUserByGithubId(githubId);
        }
      }

      if (!user) {
        throw new Error("Failed to create or retrieve user.");
      }

      const organization = this._normalizeOrganization(user.organization);
      const defaultArea = this._normalizeDefaultArea(user.default_area);

      const payload = buildJwtPayload(user, organization, defaultArea);

      req.session.user = payload;
      req.session.userId = user.user_id;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error during GitHub OAuth:", err);
          return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
        }
        return res.redirect(`${frontendURL}/home/?auth=success`);
      });
    } catch (error) {
      console.error("GitHub OAuth callback error:", error.message);
      res.redirect(`${frontendURL}/auth/?error=auth_failed`);
    }
  }
}

module.exports = new GithubOauthController();
