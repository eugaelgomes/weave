const baseRepository = require("@/modules/workspaces/repositories/base.repository");

const rolesRepository = require("@/modules/workspaces/repositories/roles.repository");

/**
 * Exige organização ativa com papel que tenha a permissão indicada (ex.: "manage_weave_ai").
 * Usar depois de `verifyToken`.
 *
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
function requireOrgPermission(permission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          error: "User not authenticated",
          success: false,
        });
      }

      const workspace = await baseRepository.getActiveWorkspaceWithMembership(userId);

      if (!workspace) {
        return res.status(404).json({
          error: "Workspace not found",
          success: false,
        });
      }

      const permissions = await rolesRepository.getUserEffectivePermissions(workspace.id, userId);

      if (!permissions || !permissions.includes(permission)) {
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient workspace permissions",
          success: false,
        });
      }

      req.organizationContext = workspace;
      return next();
    } catch (err) {
      console.error("[requireOrgPermission]", err);
      return res.status(500).json({
        error: "Internal server error",
        success: false,
      });
    }
  };
}

module.exports = { requireOrgPermission };
