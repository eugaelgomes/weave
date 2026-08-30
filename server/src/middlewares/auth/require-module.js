const baseRepository = require("@/modules/workspaces/repositories/base.repository");


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

      const workspace =
        await baseRepository.getActiveOrganizationWithMembership(userId);

      if (!workspace) {
        // Se o usuário não tem organização, não pode acessar os módulos corporativos
        return res.status(403).json({
          error: "No active workspace found.",
          success: false,
        });
      }

      const activeModules = workspace.settings?.modules || {
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
