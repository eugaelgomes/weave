const jwt = require("jsonwebtoken");
const axios = require("axios");
const { matchedData } = require("express-validator");

const AuthBaseController = require("./base.controller");
const GoogleOauthRepository = require("@/modules/authentication/repositories/google-oauth.repository");
const FindUserRepository = require("@/modules/authentication/repositories/find-user.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const cookieHelper = require("@/utils/cookie-helper");
const oauthState = require("@/modules/authentication/oauth-state");
const secretsService = require("@/services/secrets");

const setAuthCookie = cookieHelper.setAuthCookie;
const consumeAndValidateOauthState = oauthState.consumeAndValidateOauthState;
const issueOauthState = oauthState.issueOauthState;
const secretsManager = secretsService.secretsManager;

/** Callback fixo; cadastrar a mesma URL no Google Cloud Console. */
const GOOGLE_OAUTH_REDIRECT_URI =
  process.env.NODE_ENV === "production"
    ? "https://apis.weavenotes.app/api/v1/auth/signin/sso/google/callback"
    : "http://localhost:8080/api/v1/auth/signin/sso/google/callback";

/**
 * Fluxo OAuth2 Google (redirect e callback).
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
    try {
      const { code, error, state } = matchedData(req, {
        includeOptionals: true,
        locations: ["query"],
      });
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
        console.error("Erro na autorização Google:", error);
        return res.redirect(`${frontendURL}/?error=authorization_denied`);
      }

      if (!code) {
        console.error("Código de autorização não encontrado");
        return res.redirect(`${frontendURL}/?error=missing_auth_code`);
      }

      const params = new URLSearchParams();
      params.append("client_id", process.env.GOOGLE_CLIENT_ID);
      params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET);
      params.append("code", code);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", GOOGLE_OAUTH_REDIRECT_URI);

      const tokenResponse = await axios.post(
        "https://oauth2.googleapis.com/token",
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new Error("Token de acesso não recebido do Google");
      }

      const userResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
      );
      const googleUser = userResponse.data;

      if (!googleUser.id || !googleUser.email) {
        throw new Error("Dados incompletos do usuário Google");
      }

      let user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);

      if (!user) {
        const existingUser = await FindUserRepository.findUserByEmail(
          googleUser.email
        );

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
            const domainInfo =
              await OrganizationDomainsRepository.findActiveByDomain(
                emailDomain
              );

            if (domainInfo && domainInfo.status === "VERIFIED") {
              const existingInvite =
                await OrganizationsRepository.checkExistingInvite(
                  domainInfo.organization_id,
                  googleUser.email
                );

              if (!existingInvite) {
                throw new Error(
                  "Este endereço de e-mail pertence a um domínio corporativo restringido."
                );
              }
            }
          }

          await GoogleOauthRepository.createUserWithGoogle(
            googleUser.id,
            googleUser.name,
            googleUser.email,
            googleUser.picture
          );
          user = await GoogleOauthRepository.findUserByGoogleId(googleUser.id);
        }
      }

      if (!user) {
        throw new Error("Falha ao criar/encontrar usuário");
      }

      const organization = this._normalizeOrganization(user.organization);
      const defaultArea = this._normalizeDefaultArea(user.default_area);

      const payload = {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        plan_id: user.plan_id,
        org_id: organization?.id || null,
        org_unique_name: organization?.unique_name || null,
        org_member_role: organization?.member_role || null,
        org_default_area_id: defaultArea?.id || null,
        org_default_area_slug: defaultArea?.slug || null,
        org_default_area_role: defaultArea?.role || null,
      };

      const token = jwt.sign(payload, secretsManager(), {
        algorithm: "HS256",
        expiresIn: "24h",
      });

      setAuthCookie(res, req, token, {
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.redirect(`${frontendURL}/home/?auth=success`);
    } catch (error) {
      console.error("Google OAuth callback error:", error.message);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendURL}/auth/?error=auth_failed`);
    }
  }
}

module.exports = new GoogleOauthController();
