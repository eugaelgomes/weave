const ApiTokensNormalizer = require("@/modules/api-tokens/normalizer");

/**
 * Escopos disponíveis para o UI de criação de tokens.
 */
class ScopesController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getScopesInfo(req, res) {
    res.json(ApiTokensNormalizer.getAvailableScopes());
  }
}

module.exports = new ScopesController();
