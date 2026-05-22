const { fromUnknown } = require("@/errors");
const ListApiTokensRepository = require("@/modules/api-tokens/repositories/list-api-tokens.repository");

/**
 * Listagem de tokens do utilizador autenticado.
 */
class ListApiTokensController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async listTokens(req, res, next) {
    try {
      const { userId } = req.user;

      const tokens = await ListApiTokensRepository.getTokensByUserId(userId);

      res.status(200).json(tokens);
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new ListApiTokensController();
