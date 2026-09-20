const { getCookieDomain, detectSameSitePolicy } = require("@/config/allowed-origins");
const { SESSION_COOKIE_NAME } = require("@/middlewares/http/session");

/**
 * Session termination (Stateful Session).
 */
class LogoutController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<import('express').Response>}
   */
  async logout(req, res) {
    try {
      console.info(`[Logout] Destroying session for user (Request hostname: ${req.hostname})`);

      const isProduction = process.env.NODE_ENV === "production";
      const hostname = req?.hostname || "";
      const forwardedProto = req?.headers?.["x-forwarded-proto"];
      const isHttps = req?.secure || forwardedProto === "https";
      const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

      const domain =
        getCookieDomain(req.hostname) ||
        process.env.COOKIE_DOMAIN ||
        (process.env.APP_DOMAIN ? `.${process.env.APP_DOMAIN}` : undefined);
      const sameSite = isProduction && !isLocalhost ? detectSameSitePolicy() : "lax";
      const secure = isProduction && !isLocalhost ? isHttps || sameSite === "none" : false;

      const clearOptions = {
        httpOnly: true,
        path: "/",
        sameSite,
        secure,
      };

      if (domain) {
        clearOptions.domain = domain;
      }

      // New sessions use a host-only cookie; clear the previous cookie name as
      // well so deployments do not leave a stale authenticated cookie behind.
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        path: "/",
        sameSite,
        secure,
      });
      res.clearCookie("auth.sid", clearOptions);
      res.clearCookie("token", clearOptions);

      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ message: "Internal error when closing session" });
          }
          return res.status(200).json({ message: "Logout performed successfully" });
        });
      } else {
        return res.status(200).json({ message: "Logout performed successfully" });
      }
    } catch (error) {
      console.error("Error on logout:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = new LogoutController();
