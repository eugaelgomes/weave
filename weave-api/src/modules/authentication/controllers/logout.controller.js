/**
 * Encerramento de sessão (Stateful Session).
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
        `[Logout] Destroying session for user (Request hostname: ${req.hostname})`
      );

      res.clearCookie("auth.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
      });

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Erro ao destruir sessão:", err);
            return res.status(500).json({ message: "Erro interno ao encerrar sessão" });
          }
          return res.status(200).json({ message: "Logout realizado com sucesso" });
        });
      } else {
        return res.status(200).json({ message: "Logout realizado com sucesso" });
      }
    } catch (error) {
      console.error("Erro no logout:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  }
}

module.exports = new LogoutController();
