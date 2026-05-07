const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const {
  orgRoleHasPermission,
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");
const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const {
  projectRoleHasPermission,
  PROJECT_PERMISSIONS,
} = require("@/modules/projects/project-role-policy");

/**
 * Requires the authenticated user to have a given project-level permission.
 *
 * Access is granted when:
 * - User owns the project
 * - User has org-wide project access (ACCESS_ALL_ORG_PROJECTS)
 * - User is a project member whose role grants the requested permission
 *
 * This middleware expects `verifyToken` to have run before it.
 *
 * @param {string} permission One of PROJECT_PERMISSIONS.*
 * @returns {import('express').RequestHandler}
 */
function requireProjectPermission(permission) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          code: "UNAUTHORIZED",
          error: "User not authenticated",
          success: false,
        });
      }

      const projectId = req.params?.id || req.params?.projectId;
      if (!projectId) {
        return res.status(400).json({
          code: "PROJECT_ID_REQUIRED",
          error: "Project id is required",
          success: false,
        });
      }

      // Owner access.
      const accessRows = await projectsRepository.getProjectByIdWithAccess(
        projectId,
        userId
      );
      if (!accessRows?.length) {
        return res.status(404).json({
          code: "PROJECT_NOT_FOUND",
          error: "Projeto não encontrado ou você não tem acesso",
          success: false,
        });
      }

      const project = accessRows[0];
      if (project.user_id === userId) {
        return next();
      }

      // Org-wide access.
      const membership =
        await organizationsRepository.getActiveOrganizationWithMembership(userId);
      if (
        membership?.id &&
        orgRoleHasPermission(
          membership.member_role,
          ORG_PERMISSIONS.ACCESS_ALL_ORG_PROJECTS
        )
      ) {
        return next();
      }

      // Project role permission.
      const projectRole = await projectsRepository.getProjectMemberRole(
        projectId,
        userId
      );
      const allowed = projectRoleHasPermission(projectRole, permission);
      if (!allowed) {
        return res.status(403).json({
          code: "PROJECT_FORBIDDEN",
          error: "Insufficient project permissions",
          required: permission,
          success: false,
        });
      }

      return next();
    } catch (err) {
      // eslint-disable-next-line no-console -- unexpected auth/membership/repo errors
      console.error("[requireProjectPermission]", err);
      return res.status(500).json({
        code: "INTERNAL_ERROR",
        error: "Internal server error",
        success: false,
      });
    }
  };
}

module.exports = {
  requireProjectPermission,
  PROJECT_PERMISSIONS,
};

