const axios = require("axios");
const { z } = require("zod");
const crypto = require("crypto");

const AuthBaseController = require("./base.controller");
const GoogleOauthRepository = require("@/modules/authentication/repositories/google-oauth.repository");
const FindUserRepository = require("@/modules/authentication/repositories/find-user.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const oauthState = require("@/modules/authentication/oauth-state");
const { buildJwtPayload } = require("@/modules/authentication/schemas/jwt-payload.schema");

const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;

/** Fixed callback; register the same URL in the Google Cloud Console. */
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NODE_ENV === "production"
    ? "https://apis.weavenotes.app/api/v1/auth/signin/sso/google/callback"
    : "http://localhost:8080/api/v1/auth/signin/sso/google/callback";

/**
 * Google OAuth2 flow (redirect and callback).
 */
class GoogleOauthController extends AuthBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async googleAuth(req, res) {
    const state = issueOauthState({ provider: "google", req, res });
    const googleOAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_OAUTH_REDIRECT_URI)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&state=${encodeURIComponent(state)}`;
    res.redirect(googleOAuthURL);
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async googleCallback(req, res) {
    // Schema for the Google userinfo API response
    const googleUserSchema = z.object({
      email: z.string().email(),
      id: z.string().min(1),
      name: z.string().optional(),
      picture: z.string().url().optional(),
    });

    try {
      const { code, error, state } = req.query;
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";

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

      const params = new URLSearchParams();
      params.append("client_id", process.env.GOOGLE_CLIENT_ID);
      params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET);
      params.append("code", code);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", GOOGLE_OAUTH_REDIRECT_URI);

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
        const existingUser = await FindUserRepository.findUserByEmail(googleUser.email);
        let existingPendingUser = null;

        if (existingUser && existingUser.status === 'PENDING_INVITE') {
           existingPendingUser = existingUser;
        }

        if (existingUser) {
          await GoogleOauthRepository.updateUserWithGoogle(
            existingUser.user_id,
            googleUser.id,
            googleUser.picture
          );
          user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);
        } else {
          const emailDomain = googleUser.email.split("@")[1];
          if (emailDomain) {
            const domainInfo = await OrganizationDomainsRepository.findActiveByDomain(emailDomain);

            if (domainInfo && (domainInfo.status === "VERIFIED" || domainInfo.status === "PENDING")) {
              throw new Error("This email belongs to a restricted corporate domain. You must be invited.");
            }
          }

          const newUser = await GoogleOauthRepository.createUserWithGoogle(
            googleUser.id,
            googleUser.name,
            googleUser.email,
            googleUser.picture
          );
          
          const hasInvite = existingPendingUser !== null;
          if (!hasInvite) {
            const orgName = `Workspace de ${googleUser.name || googleUser.email.split('@')[0]}`;
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

          user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);
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
          console.error("Session save error during Google OAuth:", err);
          return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
        }
        return res.redirect(`${frontendURL}/home/?auth=success`);
      });
    } catch (error) {
      console.error("Google OAuth callback error:", error.message);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendURL}/auth/?error=auth_failed`);
    }
  }
}

module.exports = new GoogleOauthController();
