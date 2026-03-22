const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const SystemAuthRepository = require("@/modules/system-auth/system-auth.repository");
const { getAuthCookieOptions } = require("@/utils/cookie-helper");
const { secretsManager } = require("@/services/secrets");
// Logger simples, pode ser substituído por uma lib de logging depois se necessário
const logger = console;

class SystemAuthController {
  /**
   * Centralizador de tratamento de erros com suporte a tipos customizados
   */
  _handleError(error, res, context = "SystemAuth") {
    const statusCode = error.statusCode || 500;
    const isOperational = error.isOperational || false;

    logger.error(`[${context} Error]: ${error.message}`, {
      stack: error.stack,
      statusCode,
    });

    // Fallback de mensagem para o usuário
    const response = {
      status: "error",
      message: isOperational ? error.message : "Erro interno no servidor.",
    };

    // Tratamento específico de erros de JWT ou Autenticação
    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ status: "error", message: "Sessão expirada." });
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Login de system admin
   * POST /system-auth/login
   */
  async systemAdminLogin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        const err = new Error("E-mail e senha são campos obrigatórios.");
        err.statusCode = 400;
        err.isOperational = true;
        throw err;
      }

      // 2. Busca de Admin com tratamento de fallback
      const admin = await SystemAuthRepository.findAdminByEmail(email);

      // Proteção contra Timing Attacks: Sempre processamos o bcrypt, mesmo se admin não existir
      const dummyHash = "$2b$10$SomethingToPreventTimingAttacks";
      const actualHash = admin?.password || dummyHash;
      const isMatch = await bcrypt.compare(password, actualHash);

      if (!admin || !isMatch) {
        const err = new Error("Credenciais inválidas.");
        err.statusCode = 401;
        err.isOperational = true;
        throw err;
      }

      // 3. Validação de Status da Conta
      if (!admin.is_active || admin.is_suspended) {
        logger.warn(`Acesso negado: Conta inativa ou suspensa - ${email}`);
        const err = new Error(
          admin.is_suspended
            ? "Esta conta administrativa foi suspensa."
            : "Conta inativa."
        );
        err.statusCode = 403;
        err.isOperational = true;
        throw err;
      }

      // 4. Geração de Payload e Token
      const payload = {
        adminId: admin.id,
        role: admin.role,
        isSystemAdmin: true,
      };

      const secret = secretsManager();
      const token = jwt.sign(payload, secret, {
        algorithm: "HS256",
        expiresIn: "8h",
      });

      // 5. Persistência de Auditoria (Async)
      SystemAuthRepository.updateLastAccess(admin.id).catch((e) =>
        logger.error("Falha ao atualizar último acesso", e)
      );

      // 6. Gerenciamento de Cookies (Usando o helper do projeto)
      const cookieOptions = getAuthCookieOptions(req, {
        maxAge: 8 * 60 * 60 * 1000, // 8h
      });
      res.cookie("system_admin_token", token, cookieOptions);

      return res.status(200).json({
        status: "OK",
        message: "Autenticação realizada com sucesso.",
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
        token,
      });
    } catch (error) {
      return this._handleError(error, res, "Login");
    }
  }

  /**
   * Logout de system admin
   */
  async systemAdminLogout(req, res) {
    try {
      const cookieOptions = getAuthCookieOptions(req);
      res.clearCookie("system_admin_token", {
        ...cookieOptions,
        maxAge: 0,
      });

      return res.status(200).json({
        status: "success",
        message: "Sessão encerrada com segurança.",
      });
    } catch (error) {
      return this._handleError(error, res, "Logout");
    }
  }

  /**
   * Retorna perfil do admin logado
   */
  async getProfile(req, res) {
    try {
      const adminId = req.systemAdmin?.adminId;

      if (!adminId) {
        const err = new Error("Sessão inválida.");
        err.statusCode = 401;
        err.isOperational = true;
        throw err;
      }

      const validation =
        await SystemAuthRepository.validateAdminStatus(adminId);

      if (!validation || !validation.valid) {
        const err = new Error(validation?.reason || "Acesso negado.");
        err.statusCode = 403;
        err.isOperational = true;
        throw err;
      }

      const { admin } = validation;

      return res.status(200).json({
        status: "success",
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          user_function: admin.user_function,
          created_at: admin.created_at,
        },
      });
    } catch (error) {
      return this._handleError(error, res, "GetProfile");
    }
  }
}

module.exports = new SystemAuthController();
