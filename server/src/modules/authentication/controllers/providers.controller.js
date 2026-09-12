const { getOauthConfig, isAuthFlagEnabled } = require("../config/oauth.config");

class ProvidersController {
  async listProviders(req, res) {
    try {
      const oauth = getOauthConfig();

      const enabledOauth = ["google", "github", "microsoft"].filter(
        (provider) => oauth?.[provider]?.enabled && oauth?.[provider]?.client_id
      );

      return res.status(200).json({
        code: isAuthFlagEnabled(process.env.EMAIL_CODE_AUTH_ENABLED, true),
        credentials: true,
        oauth: enabledOauth,
        saml: isAuthFlagEnabled(process.env.SAML_AUTH_ENABLED, true),
      });
    } catch (error) {
      console.error("Error listing auth providers:", error);
      return res.status(500).json({ error: "Failed to load authentication providers." });
    }
  }
}

module.exports = new ProvidersController();
