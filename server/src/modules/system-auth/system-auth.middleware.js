const jwt = require("jsonwebtoken");
const { secretsManager } = require("@/services/secrets");
const SystemAuthRepository = require("@/modules/system-auth/system-auth.repository");

/**
 * Middleware que valida JWT de system admin
 * Verifica token, status da conta e adiciona dados em req.systemAdmin
 */
const requireSystemAdmin = async (req, res, next) => {
  try {
    // 1. Extrair token
    let token = req.cookies?.system_admin_token;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      return res.status(401).json({ error: "Token de autenticação não fornecido" });
    }

    // 2. Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, secretsManager(), { algorithms: ["HS256"] });
    } catch (error) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    // 3. Validar que é token de system admin
    if (!decoded.isSystemAdmin) {
      return res.status(403).json({ error: "Acesso negado. Token não é de system admin." });
    }

    // 4. Validar status da conta
    const validation = await SystemAuthRepository.validateAdminStatus(decoded.adminId);
    if (!validation.valid) {
      return res.status(403).json({ error: validation.reason });
    }

    // 5. Adicionar dados ao request
    req.systemAdmin = {
      adminId: decoded.adminId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("[requireSystemAdmin Error]:", error);
    return res.status(500).json({ error: "Erro ao validar autenticação" });
  }
};

/**
 * Middleware de autorização por roles
 * Uso: requireRole(['super_admin', 'manager'])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.systemAdmin) {
      return res.status(401).json({ error: "Autenticação necessária" });
    }

    const userRole = req.systemAdmin.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: "Permissão insuficiente", 
        required: allowedRoles,
        current: userRole 
      });
    }

    next();
  };
};

/**
 * Middleware para super_admin apenas
 */
const requireSuperAdmin = requireRole(["super_admin"]);

/**
 * Middleware para ações de gerenciamento (manager + super_admin)
 */
const requireManager = requireRole(["super_admin", "manager"]);

/**
 * Middleware para ações de suporte (support + manager + super_admin)
 */
const requireSupport = requireRole(["super_admin", "manager", "support"]);

module.exports = {
  requireSystemAdmin,
  requireRole,
  requireSuperAdmin,
  requireManager,
  requireSupport,
};
