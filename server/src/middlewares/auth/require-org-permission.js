const baseRepository = require("@/modules/workspaces/repositories/base.repository");

const { orgRoleHasPermission } = require("@/modules/workspaces/workspace-role-policy");

/**
 * Exige organização ativa com papel que tenha a permissão indicada (ex.: super_admin).
 * Usar depois de `verifyToken`.
 *
 * @param {string} permission — valor de ORG_PERMISSIONS.*
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

      const workspace =
        await baseRepository.getActiveOrganizationWithMembership(userId);

      if (!workspace) {
        return res.status(404).json({
          error: "Workspace not found",
          success: false,
        });
      }

      const role = workspace.member_role;
      if (!role || !orgRoleHasPermission(role, permission)) {
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
