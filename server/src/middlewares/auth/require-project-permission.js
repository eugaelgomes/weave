const baseRepository = require("@/modules/workspaces/repositories/base.repository");

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
 * - User has org-wide project access (ACCESS_ALL_WORKSPACE_PROJECTS)
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

      let project = null;
      let resolvedViaWorkspaceWide = false;

      const memberRows = await projectsRepository.getProjectByIdWithAccess(projectId, userId);
      if (memberRows?.length) {
        project = memberRows[0];
      } else {
        const membership = await baseRepository.getActiveWorkspaceWithMembership(
          userId,
          undefined,
          req.user?.workspace_public_id
        );
        if (membership?.id && membership.permissions?.includes("access_all_workspace_projects")) {
          const orgRows = await projectsRepository.getProjectByIdWithWorkspaceScope(
            projectId,
            membership.id
          );
          if (orgRows?.length) {
            project = orgRows[0];
            resolvedViaWorkspaceWide = true;
          }
        }
      }

      if (!project) {
        return res.status(404).json({
          code: "PROJECT_NOT_FOUND",
          error: "Projeto não encontrado ou você não tem acesso",
          success: false,
        });
      }

      if (String(project.user_id) === String(userId)) {
        return next();
      }

      if (resolvedViaWorkspaceWide) {
        return next();
      }

      const membership = await baseRepository.getActiveWorkspaceWithMembership(
        userId,
        undefined,
        req.user?.workspace_public_id
      );
      if (membership?.id && membership.permissions?.includes("access_all_workspace_projects")) {
        const orgRows = await projectsRepository.getProjectByIdWithWorkspaceScope(
          projectId,
          membership.id
        );
        if (orgRows?.length) {
          return next();
        }
      }

      const projectRole = await projectsRepository.getProjectMemberRole(projectId, userId);
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
  PROJECT_PERMISSIONS,
  requireProjectPermission,
};
