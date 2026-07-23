const BaseController = require("./base.controller");
const SearchUsersService = require("@/modules/users/utils/search-users.util");

/**
 * Public user search by term (min 3 chars), excluding the requester.
 * Supports context-aware search.
 */
class SearchUsersController extends BaseController {
  /**
   * @param {import('express').Request & { query: { q?: string, contextType?: string, contextId?: string }, user?: { userId: string|number } }} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async searchUsers(req, res, next) {
    try {
      const { q, contextType, contextId } = req.query;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!q || q.trim().length < 3) {
        return res.status(400).json({
          error: "The search query must be at least 3 characters long.",
        });
      }

      const searchTerm = q.trim();

      const search_users = await SearchUsersService.searchWithContext(
        searchTerm,
        userId,
        contextType,
        contextId
      );

      const filteredUsers = search_users
        .filter((user) => user && user.id !== userId) // Note: ID was mapped to id inside Service
        .map((user) => ({
          avatar_url: user.avatar_url,
          context_info: user.context_info,
          email: user.email,
          id: user.id,
          name: user.name,
          username: user.username,
        }));

      res.status(200).json({
        search_users: filteredUsers,
        search_users_query: searchTerm,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}
module.exports = new SearchUsersController();
