const jwt = require("jsonwebtoken");
const axios = require("axios");

const AuthBaseController = require("./base.controller");
const GithubOauthRepository = require("@/modules/authentication/repositories/github-oauth.repository");
const FindUserRepository = require("@/modules/authentication/repositories/find-user.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const cookieHelper = require("@/utils/cookie-helper");
const secretsService = require("@/services/secrets");

const setAuthCookie = cookieHelper.setAuthCookie;
const secretsManager = secretsService.secretsManager;

/**
 * Fluxo OAuth2 GitHub (redirect e callback).
 */
class GithubOauthController extends AuthBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async githubAuth(req, res) {
    const githubOAuthURL = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GITHUB_REDIRECT_URI)}&scope=user:email`;

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
      const { code, error } = req.query;

      if (error) {
        console.error("Erro durante a autenticação com o GitHub", error);
        return res.redirect(`${frontendURL}/?error=authorization_denied`);
      }

      if (!code) {
        console.error("Código de autorização do GitHub não encontrado");
        return res.redirect(`${frontendURL}/?error=missing_auth_code`);
      }

      const redirectURI =
        process.env.NODE_ENV === "production"
          ? "https://apis.weavenotes.app/api/v1/auth/signin/sso/github/callback"
          : "http://localhost:8080/api/v1/auth/signin/sso/github/callback";

      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code: code,
          redirect_uri: redirectURI,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new Error("Token de acesso não recebido do GitHub");
      }

      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Weave-Notes",
        },
      });
      const githubUser = userResponse.data;

      const emailsResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Weave-Notes-App",
          },
        }
      );

      const emails = Array.isArray(emailsResponse.data)
        ? emailsResponse.data
        : [];
      const primaryEmailObj =
        emails.find((e) => e.primary && e.verified) ||
        emails.find((e) => e.verified) ||
        emails[0];

      const userEmail = primaryEmailObj?.email;
      const githubId = githubUser?.id ? String(githubUser.id) : null;

      if (!githubId || !userEmail) {
        throw new Error("Dados incompletos do utilizador no GitHub");
      }

      let user = await GithubOauthRepository.findUserByGithubId(githubId);

      if (!user) {
        const existingUser = await FindUserRepository.findUserByEmail(userEmail);

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
            const domainInfo =
              await OrganizationDomainsRepository.findActiveByDomain(
                emailDomain
              );

            if (domainInfo && domainInfo.status === "VERIFIED") {
              const existingInvite =
                await OrganizationsRepository.checkExistingInvite(
                  domainInfo.organization_id,
                  userEmail
                );

              if (!existingInvite) {
                throw new Error(
                  "Este endereço de e-mail pertence a um domínio corporativo restrito."
                );
              }
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
          user = await GithubOauthRepository.findUserByGithubId(githubId);
        }
      }

      if (!user) {
        throw new Error(
          "Falha catastrófica ao criar ou recuperar o utilizador"
        );
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

      res.redirect(`${frontendURL}/app/home?auth=success`);
    } catch (error) {
      console.error("GitHub OAuth callback error:", error.message);
      res.redirect(`${frontendURL}/?error=auth_failed`);
    }
  }
}

module.exports = new GithubOauthController();
