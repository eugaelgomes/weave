const axios = require("axios");
const { z } = require("zod");
const crypto = require("crypto");

const AuthBaseController = require("./base.controller");
const MicrosoftOauthRepository = require("@/modules/authentication/repositories/microsoft-oauth.repository");
const FindUserRepository = require("@/modules/authentication/repositories/find-user.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const oauthState = require("@/modules/authentication/oauth-state");
const { buildJwtPayload } = require("@/modules/authentication/schemas/jwt-payload.schema");

const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;

const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || "common";
const MICROSOFT_OAUTH_REDIRECT_URI =
  process.env.NODE_ENV === "production"
    ? "https://apis.weavenotes.app/api/v1/auth/signin/sso/microsoft/callback"
    : "http://localhost:8080/api/v1/auth/signin/sso/microsoft/callback";

/**
 * OAuth2 flow for Microsoft Entra ID / Microsoft accounts.
 */
class MicrosoftOauthController extends AuthBaseController {
  /**
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   */
  async microsoftAuth(req, res) {
    const state = issueOauthState({ provider: "microsoft", req, res });
    const microsoftOAuthURL = `https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_TENANT_ID)}/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(MICROSOFT_OAUTH_REDIRECT_URI)}&response_mode=query&scope=${encodeURIComponent("openid profile email User.Read")}&state=${encodeURIComponent(state)}`;
    res.redirect(microsoftOAuthURL);
  }

  /**
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   * @returns {Promise<void>}
   */
  async microsoftCallback(req, res) {
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
      const { code, error, state } = req.query;

      const isValidOauthState = consumeAndValidateOauthState({
        provider: "microsoft",
        req,
        res,
        state,
      });
      if (!isValidOauthState) {
        return res.redirect(`${frontendURL}/?error=invalid_oauth_state`);
      }

      if (error) {
        console.error("Error during Microsoft authentication", error);
        return res.redirect(`${frontendURL}/?error=authorization_denied`);
      }

      if (!code) {
        console.error("Microsoft authorization code not found");
        return res.redirect(`${frontendURL}/?error=missing_auth_code`);
      }

      const tokenPayload = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: MICROSOFT_OAUTH_REDIRECT_URI,
        scope: "openid profile email User.Read",
      });

      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${encodeURIComponent(MICROSOFT_TENANT_ID)}/oauth2/v2.0/token`,
        tokenPayload.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token } = tokenResponse.data;
      if (!access_token) {
        throw new Error("Access token not received from Microsoft.");
      }

      const userResponse = await axios.get(
        "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
      // Schema for Microsoft Graph /me response
      const microsoftUserSchema = z
        .object({
          displayName: z.string().nullable().optional(),
          id: z.string().min(1),
          mail: z.string().email().nullable().optional(),
          userPrincipalName: z.string().min(1).optional(),
        })
        .refine((u) => !!(u.mail || u.userPrincipalName), {
          message: "No email found in Microsoft user profile.",
        });

      const microsoftUserResult = microsoftUserSchema.safeParse(userResponse.data);
      if (!microsoftUserResult.success) {
        throw new Error("Incomplete or invalid user data received from Microsoft.");
      }
      const microsoftUser = microsoftUserResult.data;
      const microsoftId = microsoftUser.id;
      const userEmail = microsoftUser.mail || microsoftUser.userPrincipalName;

      let user = await MicrosoftOauthRepository.findUserByMicrosoftId(microsoftId);

      if (!user) {
        const existingUser = await FindUserRepository.findUserByEmail(userEmail);
        let existingPendingUser = null;

        if (existingUser && existingUser.status === "PENDING_INVITE") {
          existingPendingUser = existingUser;
        }

        if (existingUser) {
          await MicrosoftOauthRepository.updateUserWithMicrosoft(existingUser.user_id, microsoftId);
          user = await MicrosoftOauthRepository.findUserByMicrosoftId(microsoftId);
        } else {
          const emailDomain = userEmail.split("@")[1];
          if (emailDomain) {
            const domainInfo = await OrganizationDomainsRepository.findActiveByDomain(emailDomain);

            if (
              domainInfo &&
              (domainInfo.status === "VERIFIED" || domainInfo.status === "PENDING")
            ) {
              throw new Error(
                "This email belongs to a restricted corporate domain. You must be invited."
              );
            }
          }

          const newUser = await MicrosoftOauthRepository.createUserWithMicrosoft(
            microsoftId,
            microsoftUser.displayName || userEmail.split("@")[0],
            userEmail
          );

          const hasInvite = existingPendingUser !== null;
          if (!hasInvite) {
            const orgName = `Workspace de ${microsoftUser.displayName || userEmail.split("@")[0]}`;
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

          user = await MicrosoftOauthRepository.findUserByMicrosoftId(microsoftId);
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
          console.error("Session save error during Microsoft OAuth:", err);
          return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
        }
        return res.redirect(`${frontendURL}/home/?auth=success`);
      });
    } catch (error) {
      console.error("Microsoft OAuth callback error:", error.message);
      return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
    }
  }
}

module.exports = new MicrosoftOauthController();
