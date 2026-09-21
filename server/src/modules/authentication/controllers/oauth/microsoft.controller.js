const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const axios = require("axios");
const { z } = require("zod");

const AuthBaseController = require("../base.controller");
const MicrosoftOauthRepository = require("../../repositories/oauth/microsoft.repository");
const AuthRepository = require("../../repositories/auth.repository");

const oauthState = require("../../utils/oauth-state.util");
const { buildJwtPayload } = require("../../schemas/session.schema");
const { getOauthConfig } = require("../../config/oauth.config");
const {
  consumeMcpAuthorization,
  rememberMcpAuthorization,
} = require("../../utils/mcp-oauth-return.util");

const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;

/**
 * OAuth2 flow for Microsoft Entra ID / Microsoft accounts.
 */
class MicrosoftOauthController extends AuthBaseController {
  async microsoftAuth(req, res) {
    const { microsoft } = getOauthConfig();

    if (!microsoft?.enabled || !microsoft?.client_id) {
      return res.status(404).json({ error: "Microsoft authentication is not configured." });
    }

    rememberMcpAuthorization(req, req.query.return_to);
    const tenantId = microsoft.tenant_id || "common";
    const redirectUri = microsoft.redirect_uri;
    const state = issueOauthState({ provider: "microsoft", req, res });

    const url = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/authorize?client_id=${microsoft.client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${encodeURIComponent("openid profile email User.Read")}&state=${encodeURIComponent(state)}`;
    res.redirect(url);
  }

  async microsoftCallback(req, res) {
    const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
    let phase = "configuration";

    try {
      const { microsoft } = getOauthConfig();

      if (!microsoft?.enabled || !microsoft?.client_id || !microsoft?.client_secret) {
        throw new Error("Microsoft authentication is not correctly configured.");
      }

      const tenantId = microsoft.tenant_id || "common";
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

      const redirectUri = microsoft.redirect_uri;
      const tokenPayload = new URLSearchParams({
        client_id: microsoft.client_id,
        client_secret: microsoft.client_secret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        scope: "openid profile email User.Read",
      });

      phase = "token";
      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
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

      phase = "profile";
      const userResponse = await axios.get(
        "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );
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

      phase = "provisioning";
      let user = await MicrosoftOauthRepository.findUserByMicrosoftId(microsoftId);

      if (!user) {
        const existingUser = await AuthRepository.findUserByEmail(userEmail);

        if (existingUser) {
          await MicrosoftOauthRepository.updateUserWithMicrosoft(
            existingUser.user_id,
            microsoftId,
            microsoftUser.displayName
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

          await MicrosoftOauthRepository.createUserWithMicrosoft(
            microsoftId,
            microsoftUser.displayName || userEmail.split("@")[0],
            userEmail
          );
        }

        user = await MicrosoftOauthRepository.findUserByMicrosoftId(microsoftId);

        if (!user) {
          throw new Error("Failed to create or retrieve user.");
        }
      }

      phase = "session";
      const workspace = this._normalizeWorkspace(user.workspace);
      const defaultTeam = this._normalizeDefaultTeam(user.default_team);

      const payload = buildJwtPayload(user, workspace, defaultTeam);

      req.session.user = payload;
      req.session.userId = user.user_id;
      const postLoginRedirect = consumeMcpAuthorization(req);

      phase = "session_persistence";
      req.session.save((err) => {
        if (err) {
          console.error("Microsoft OAuth session save error:", {
            code: err.code || null,
            constraint: err.constraint || err.meta?.target || null,
            message: err.message,
            phase,
          });
          return res.redirect(
            `${frontendURL}/auth/?error=auth_failed&provider=microsoft&phase=session_persistence`
          );
        }
        return res.redirect(postLoginRedirect || `${frontendURL}${this._getPostAuthenticationPath(user)}`);
      });
    } catch (error) {
      console.error("Microsoft OAuth callback error:", {
        code: error.code || null,
        constraint: error.constraint || error.meta?.target || null,
        message: error.message,
        phase,
      });
      return res.redirect(
        `${frontendURL}/auth/?error=auth_failed&provider=microsoft&phase=${encodeURIComponent(phase)}`
      );
    }
  }
}

module.exports = new MicrosoftOauthController();
