const MutateApiTokensRepository = require("@/modules/api-tokens/repositories/mutate-api-tokens.repository");

/**
 * Revogação e eliminação lógica de API tokens.
 */
class MutateApiTokensController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async revokeToken(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      const revoked = await MutateApiTokensRepository.revokeToken(id, userId);

      if (!revoked) {
        return res
          .status(404)
          .json({ error: "Token não encontrado ou já deletado." });
      }

      res
        .status(200)
        .json({ message: "Token revogado com sucesso.", record: revoked });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async deleteToken(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      const deleted = await MutateApiTokensRepository.deleteToken(id, userId);

      if (!deleted) {
        return res.status(404).json({ error: "Token não encontrado." });
      }

      res.status(200).json({ message: "Token deletado com sucesso." });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MutateApiTokensController();
