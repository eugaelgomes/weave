const { fromUnknown } = require("@/errors");
const MutateApiTokensRepository = require("@/modules/api-tokens/repositories/mutate-api-tokens.repository");

/**
 * Revocation and logical deletion of API tokens.
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
          .json({ error: "Token not found or already revoked." });
      }

      res
        .status(200)
        .json({ message: "Token revoked successfully.", record: revoked });
    } catch (error) {
      next(fromUnknown(error));
    }
  }


}

module.exports = new MutateApiTokensController();
