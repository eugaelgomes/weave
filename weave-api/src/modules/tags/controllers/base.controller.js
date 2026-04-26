/**
 * Controller base de tags: validação de usuário autenticado (`verifyToken`).
 */
class TagsBaseController {
  /**
   * @param {import('express').Request} req
   * @returns {string|number} `req.user.userId` quando autenticado.
   * @throws {Error} Quando a requisição não tem usuário autenticado.
   */
  _validateAuthentication(req) {
    if (!req.user || !req.user.userId) {
      throw new Error("Access denied: user is not authenticated");
    }
    return req.user.userId;
  }

  /**
   * Garante usuário autenticado e responde 401 em JSON quando não houver.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {string|number|null} `userId` ou `null` se já enviou resposta.
   */
  _requireAuthenticatedUser(req, res) {
    try {
      return this._validateAuthentication(req);
    } catch {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }
  }
}

module.exports = TagsBaseController;
