const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

/**
 * Middleware para bloquear acesso a módulos desativados pela organização.
 * Requer que o usuário esteja autenticado (`verifyToken`).
 *
 * @param {string} moduleName - Nome do módulo ("projects", "notes", "agent_house", "weave_flow", "calendar")
 * @returns {import('express').RequestHandler}
 */
function requireModule(moduleName) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: "User not authenticated",
          success: false,
        });
      }

      const organization =
        await organizationsRepository.getActiveOrganizationWithMembership(userId);

      if (!organization) {
        // Se o usuário não tem organização, não pode acessar os módulos corporativos
        return res.status(403).json({
          error: "No active organization found.",
          success: false,
        });
      }

      const activeModules = organization.settings?.modules || {
        agent_house: true,
        calendar: true,
        notes: true,
        projects: true,
        weave_flow: true,
      };

      // Se a chave existir no JSONB mas estiver explicitamente como 'false', bloqueia.
      if (activeModules[moduleName] === false) {
        return res.status(403).json({
          code: "MODULE_DISABLED",
          error: `O módulo '${moduleName}' está desativado para esta organização.`,
          success: false,
        });
      }

      return next();
    } catch (err) {
      console.error(`[requireModule:${moduleName}]`, err);
      return res.status(500).json({
        error: "Internal server error while checking module permissions.",
        success: false,
      });
    }
  };
}

module.exports = { requireModule };
