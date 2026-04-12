const cookieHelper = require("@/utils/cookie-helper");

const clearAuthCookie = cookieHelper.clearAuthCookie;

/**
 * Encerramento de sessão (cookie e sessão Express).
 */
class LogoutController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<import('express').Response>}
   */
  async logout(req, res) {
    try {
      console.log(
        `[Logout] Clearing cookie (Request hostname: ${req.hostname})`
      );

      clearAuthCookie(res, req);

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Erro ao destruir sessão:", err);
          }
        });
      }

      return res.status(200).json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Erro no logout:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  }
}

module.exports = new LogoutController();
