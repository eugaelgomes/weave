const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const {
  orgRoleHasPermission,
} = require("@/modules/organizations/organization-role-policy");

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

      const organization =
        await organizationsRepository.getActiveOrganizationWithMembership(
          userId
        );

      if (!organization) {
        return res.status(404).json({
          error: "Organization not found",
          success: false,
        });
      }

      const role = organization.member_role;
      if (!role || !orgRoleHasPermission(role, permission)) {
        return res.status(403).json({
          code: "ORG_FORBIDDEN",
          error: "Insufficient organization permissions",
          success: false,
        });
      }

      req.organizationContext = organization;
      return next();
    } catch (err) {
      // eslint-disable-next-line no-console -- diagnóstico de falha inesperada na org ativa
      console.error("[requireOrgPermission]", err);
      return res.status(500).json({
        error: "Internal server error",
        success: false,
      });
    }
  };
}

module.exports = { requireOrgPermission };
