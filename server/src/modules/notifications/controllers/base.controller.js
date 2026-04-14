/**
 * Controller base de notificações: validação de usuário autenticado (`verifyToken`).
 */
class NotificationsBaseController {
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
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {string|number|null}
   */
  _requireAuthenticatedUser(req, res) {
    try {
      return this._validateAuthentication(req);
    } catch {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }
  }

  _handleRepositoryResult(result, res) {
    if (!result) {
      res.status(404).json({ error: "Notificação não encontrada" });
      return null;
    }

    return result;
  }

  _extractBoolean(value) {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (["true", "1"].includes(value.toLowerCase())) {
        return true;
      }
      if (["false", "0"].includes(value.toLowerCase())) {
        return false;
      }
      return null;
    }

    return null;
  }
}

module.exports = NotificationsBaseController;
