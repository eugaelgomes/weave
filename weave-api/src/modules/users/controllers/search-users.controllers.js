const BaseController = require("./base.controller");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");

/**
 * Busca pública de usuários por termo (mínimo 3 caracteres), excluindo o solicitante.
 */
class SearchUsersController extends BaseController {
  /**
   * @param {import('express').Request & { query: { q?: string }, user?: { userId: string|number } }} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!q || q.trim().length < 3) {
        return res.status(400).json({
          error: "The search query must be at least 3 characters long.",
        });
      }

      const searchTerm = q.trim();

      const search_users = await SearchUsersRepository.searchUsers(searchTerm);

      const filteredUsers = search_users
        .filter((user) => user && user.user_id !== userId)
        .map((user) => ({
          id: user.user_id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        }));

      res.status(200).json({
        search_users_query: searchTerm,
        search_users: filteredUsers,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}
module.exports = new SearchUsersController();
