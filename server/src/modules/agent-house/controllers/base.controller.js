/**
 * @module agent-house/controllers/base.controller
 * @description Classe abstrata e utilitários compartilhados para os controllers do Agent House.
 */
const { AppError } = require("@/errors");
const WorkspacesBaseController = require("@/modules/workspaces/controllers/base-controller");

class AgentHouseBaseController extends WorkspacesBaseController {
  /**
   * Validates if a user is authenticated and returns the user ID.
   *
   * @param {import("express").Request} req - The Express request object.
   * @returns {string} The authenticated user's ID.
   * @throws {AppError} If the user is not authenticated.
   */
  _validateAuthentication(req) {
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw AppError.unauthorized("Authentication required");
    }
    return userId;
  }

  /**
   * Helper function to extract workspace ID from request if needed.
   *
   * @param {import("express").Request} req - The Express request object.
   * @returns {string|null} The current workspace ID, or null if not found.
   */
  _extractWorkspaceId(req) {
    return req.user?.workspaceId || req.user?.workspace_id || req.body?.workspaceId || null;
  }
}

module.exports = AgentHouseBaseController;
