const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { validationResult } = require("express-validator");
const AuthRepository = require("@/modules/auth/auth.repository");
const { getCookieDomain } = require("@/config/allowed-origins");

const authLogs = require("@/utils/system_logs/auth-logs");
const { secretsManager } = require("@/services/secrets");
class AuthController {
  async userSignin(req, res) {
    const { login, password } = req.body;
    const username = login;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({
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

      // Autenticação via Google
      if (user.auth_with_google) {
        return res.status(401).json({
          message:
            "Esta conta usa autenticação via Google. Por favor, faça login com o Google.",
        });
      }

      const verifiedAccount = user.email_verified;
      if (!verifiedAccount) {
        return res.status(403).json({
          message:
            "Por favor, verifique seu e-mail no mensagem de boas-vindas antes de fazer login.",
        });
      }
      // Compara senha
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "Usuário/e-mail ou senha inválidos" });
      }

      const payload = {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        name: user.name,
        org_id: user.org_id,
        org_unique_name: user.org_unique_name,
        plan_id: user.plan_id,
      };

      const token = jwt.sign(payload, secretsManager(), {
        algorithm: "HS256",
        expiresIn: "12h",
      });

      authLogs.createLog(user.user_id, "auth_login", req, "success");

      const domain = getCookieDomain(req.hostname);

      // Token https only
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 12 * 60 * 60 * 1000,
        path: "/",
        domain: domain,
      });

      // Res de login com token para login via Request Postman/Insomnia/Curl
      const login_time = new Date();
      return res.status(200).json({
        user_data: {
          profile: {
            id: user.user_id,
            name: user.name,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            birth_date: user.birth_date,
            phone_number: user.phone_number,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          settings: {
            theme_mode: user.theme_mode,
            private_profile: user.private_profile,
            auth_with_google: user.auth_with_google,
          },
          organization: {
            id: user.org_id,
            unique_name: user.org_unique_name,
            name: user.org_name,
            role: user.org_member_role || [] || null,
          },
          current_plan: {
            id: user.user_plan_id,
            name: user.plan_name,
            client_type: user.client_type,
            details: user.plan_details || {},
          },
          current_plan_usage: {
            plan_id: user.usage_plan_id,
            plan_name: user.usage_plan_name,
            client_type: user.usage_client_type,
            period_start: user.period_start,
            period_end: user.period_end,
            details: user.usage_details || {},
          },
        },
        token: token,
        login_time: login_time,
        token_expires_in: 12 * 60 * 60,
        redirect: true,
        redirect_url: "/app/home",
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

      // Log das configurações para debug
      console.log("=== DEBUG Google OAuth ===");
      console.log("CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
      console.log("REDIRECT_URI:", process.env.GOOGLE_REDIRECT_URI);
      console.log(
        "CLIENT_SECRET presente:",
        !!process.env.GOOGLE_CLIENT_SECRET
      );
      console.log("Code recebido:", code.substring(0, 20) + "...");

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

      let user = null;

      // Primeiro, tentar encontrar por Google ID
      user = await AuthRepository.findUserByGoogleId(googleUser.id);

      if (!user) {
        // Se não encontrou por Google ID, tentar por email
        user = await AuthRepository.findUserByEmail(googleUser.email);

        if (user) {
          // Usuário existe mas ainda não tem Google ID associado
          user = await AuthRepository.updateUserWithGoogle(
            user.user_id,
            googleUser.id,
            googleUser.picture
          );
        } else {
          // Usuário não existe, criar novo
          user = await AuthRepository.createUserWithGoogle(
            googleUser.id,
            googleUser.name,
            googleUser.email,
            googleUser.picture
          );
        }
      }

      if (!user) {
        throw new Error("Falha ao criar/encontrar usuário");
      }

      // Gerar JWT token
      const payload = {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        name: user.name,
      };

      const token = jwt.sign(payload, secretsManager(), {
        algorithm: "HS256",
        expiresIn: "24h",
      });

      // Definir cookie com token
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/",
      });

      // Redirecionar para o frontend
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendURL}/app/home?auth=success`);
    } catch (error) {
      console.error("=== ERRO no callback Google ===");
      console.error("Mensagem:", error.message);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error(
          "Dados do erro:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
      console.error("Stack:", error.stack);
      const frontendURL = process.env.FRONTEND_URL || "http://localhost:3000";
      res.redirect(`${frontendURL}/?error=auth_failed`);
    }
  }

  async logout(req, res) {
    try {
      const domain = getCookieDomain(req.hostname);

      console.log(
        `[Logout] Clearing cookie domain: ${domain} (Request hostname: ${req.hostname})`
      );

      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        domain: domain,
      });

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
