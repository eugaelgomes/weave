const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { validationResult } = require("express-validator");
const AuthRepository = require("@/modules/authentication/auth.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const { setAuthCookie, clearAuthCookie } = require("@/utils/cookie-helper");

const authLogs = require("@/utils/system_logs/auth-logs");
const { secretsManager } = require("@/services/secrets");
const { presignObjectFields } = require("@/utils/data/presign-storage-files");

const normalizeDefaultArea = (defaultAreaData) => {
  if (!defaultAreaData) {
    return null;
  }

  return {
    id: defaultAreaData.org_default_area_id,
    name: defaultAreaData.org_default_area_name,
    slug: defaultAreaData.org_default_area_slug,
    role: defaultAreaData.org_default_area_role,
    member_since: defaultAreaData.org_default_area_member_since,
    description: defaultAreaData.org_default_area_description,
    properties: defaultAreaData.org_default_area_properties || {},
  };
};

const normalizeOrganization = (organizationData) => {
  if (!organizationData) {
    return null;
  }

  return {
    id: organizationData.org_id,
    unique_name: organizationData.org_unique_name,
    name: organizationData.org_name,
    logo_url: organizationData.org_logo_url,
    member_role: organizationData.org_member_role,
    member_since: organizationData.org_member_since,
  };
};

class AuthController {
  async userSignin(req, res) {
    const { login, password } = req.body;
    const username = login;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Dados não podem ser nulos ou inválidos.",
        errors: errors.array(),
      });
    }

    try {
      // username: email ou username
      const user = await AuthRepository.findUserByUsername(username);

      if (!user) {
        return res
          .status(401)
          .json({ message: "Usuário/e-mail ou senha inválidos" });
      }

      // Conta Google sem senha definida — só pode logar via Google
      if (user.auth_with_google && !user.password) {
        return res.status(401).json({
          message:
            "Esta conta usa autenticação via Google. Por favor, faça login com o Google.",
        });
      }

      const verifiedAccount = user.email_verified;
      if (!verifiedAccount) {
        return res.status(403).json({
          message: "Por favor, verifique seu e-mail antes de fazer login.",
        });
      }

      const comparePassword = await bcrypt.compare(password, user.password);
      if (!comparePassword) {
        return res
          .status(401)
          .json({ message: "Usuário/e-mail ou senha inválidos" });
      }

      const organization = normalizeOrganization(user.organization);
      const defaultArea = normalizeDefaultArea(user.default_area);

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
        expiresIn: "12h",
      });

      authLogs.createLog(user.user_id, "auth_login", req, "success");

      // Gerar URLs pré-assinadas para avatar e logo (válidas por 12h para coincidir com o token)
      const protectedUser = await presignObjectFields(user, ["avatar_url"], 12 * 60 * 60);
      const protectedOrg = organization ? await presignObjectFields(organization, ["logo_url"], 12 * 60 * 60) : null;

      // Token https only
      setAuthCookie(res, req, token, {
        maxAge: 12 * 60 * 60 * 1000,
      });

      // Res de login com token para login via Request Postman/Curl
      return res.status(200).json({
        status: "OK",
        message: "Successfully performed user signin.",
        user: {
          user_profile: {
            id: protectedUser.user_id,
            name: protectedUser.user_name || protectedUser.name,
            username: protectedUser.username,
            email: protectedUser.email,
            avatar_url: protectedUser.avatar_url,
          },
          user_settings: {
            theme_mode: protectedUser.theme_mode,
            private_profile: protectedUser.private_profile,
          },
          user_organization: {
            id: protectedOrg?.id || null,
            unique_name: protectedOrg?.unique_name || null,
            name: protectedOrg?.name || null,
            logo_url: protectedOrg?.logo_url || null,
            role: protectedOrg?.member_role || null,
            member_since: protectedOrg?.member_since || null,
            default_area: defaultArea,
          },
          user_subscription: {
            plan_id: user.plan_id,
            plan_name: user.plan_name,
            plan_details: user.plan_details || {},
          },
        },
        auth: {
          token: token,
          expires_in: 12 * 60 * 60,
          login_time: new Date(),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async googleAuth(req, res) {
    // Redireciona para o endpoint do Google OAuth2
    const googleOAuthURL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;
    res.redirect(googleOAuthURL);
  }

  async googleCallback(req, res) {
    try {
      const { code, error } = req.query;

      // Verificar se houve erro na autorização
      if (error) {
        console.error("Erro na autorização Google:", error);
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendURL}/?error=authorization_denied`);
      }

      if (!code) {
        console.error("Código de autorização não encontrado");
        const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
        return res.redirect(`${frontendURL}/?error=missing_auth_code`);
      }

      // Trocar o código por tokens de acesso
      // Google recomenda enviar os parâmetros no corpo como x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append("client_id", process.env.GOOGLE_CLIENT_ID);
      params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET);
      params.append("code", code);
      params.append("grant_type", "authorization_code");
      params.append("redirect_uri", process.env.GOOGLE_REDIRECT_URI);

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

      // Obter informações do usuário do Google
      const userResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
      );
      const googleUser = userResponse.data;

      if (!googleUser.id || !googleUser.email) {
        throw new Error("Dados incompletos do usuário Google");
      }

      // Primeiro, tentar encontrar por Google ID
      let user = await AuthRepository.findUserByGoogleId(googleUser.id);

      if (!user) {
        // Se não encontrou por Google ID, tentar por email
        const existingUser = await AuthRepository.findUserByEmail(
          googleUser.email
        );

        if (existingUser) {
          // Usuário existe mas ainda não tem Google ID associado
          await AuthRepository.updateUserWithGoogle(
            existingUser.user_id,
            googleUser.id,
            googleUser.picture
          );
          // Re-buscar com dados completos (org, plan, etc.)
          user = await AuthRepository.findUserByGoogleId(googleUser.id);
        } else {
          // Validar Domínio Corporativo
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

          // Usuário não existe, criar novo
          await AuthRepository.createUserWithGoogle(
            googleUser.id,
            googleUser.name,
            googleUser.email,
            googleUser.picture
          );
          // Re-buscar com dados completos
          user = await AuthRepository.findUserByGoogleId(googleUser.id);
        }
      }

      if (!user) {
        throw new Error("Falha ao criar/encontrar usuário");
      }

      const organization = normalizeOrganization(user.organization);
      const defaultArea = normalizeDefaultArea(user.default_area);

      // Gerar JWT token com payload completo
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

      // Definir cookie com token
      setAuthCookie(res, req, token, {
        maxAge: 24 * 60 * 60 * 1000,
      });

      // Redirecionar para o frontend
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendURL}/app/home?auth=success`);
    } catch (error) {
      console.error("Google OAuth callback error:", error.message);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendURL}/?error=auth_failed`);
    }
  }

  async logout(req, res) {
    try {
      console.log(
        `[Logout] Clearing cookie (Request hostname: ${req.hostname})`
      );

      clearAuthCookie(res, req);

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Erro ao destruir sessão:", err);
          }
        });
      }

      return res.status(200).json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Erro no logout:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  //  async refreshToken(req, res) {
  //    try {
  //      const currentToken = req.cookies?.token;
  //      if (!currentToken) {
  //        return res.status(401).json({ message: "Token não encontrado" });
  //      }
  //
  //      // Verifica se o token atual ainda é válido
  //      const decoded = jwt.verify(currentToken, secretKey);
  //
  //      // Busca dados atualizados do usuário
  //      const user = await AuthRepository.findUserByUsername(decoded.username);
  //      if (!user) {
  //        return res.status(404).json({ message: "Usuário não encontrado" });
  //      }
  //
  //      // Gera novo token com dados atualizados
  //      const payload = {
  //        userId: user.user_id,
  //        username: user.username,
  //        email: user.email,
  //        name: user.name,
  //        //role_name: user.role_name,
  //      };
  //
  //      const newToken = jwt.sign(payload, secretKey, {
  //        algorithm: "HS256",
  //        expiresIn: "24h",
  //      });
  //
  //      // Define novo cookie
  //      res.cookie("token", newToken, {
  //        httpOnly: true,
  //        secure: process.env.NODE_ENV === "production",
  //        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  //        maxAge: 24 * 60 * 60 * 1000,
  //        path: "/",
  //        // Sem domain explícito para compatibilidade com múltiplos hosts
  //      });
  //
  //      return res.status(200).json({
  //        user: {
  //          id: user.user_id,
  //          username: user.username,
  //          email: user.email,
  //          name: user.name,
  //          avatar_url: user.avatar_url,
  //          //role_name: user.role_name,
  //        },
  //      });
  //    } catch (error) {
  //      console.error("Erro ao renovar token:", error);
  //      return res.status(401).json({ message: "Token inválido ou expirado" });
  //    }
  //  }
}

module.exports = new AuthController();
