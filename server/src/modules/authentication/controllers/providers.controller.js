const systemSettings = require("@/modules/workspaces/services/system-settings.cache");

class ProvidersController {
  async listProviders(req, res) {
    try {
      const oauth = await systemSettings.getOauthConfig();

      const enabledOauth = ["google", "github", "microsoft"].filter(
        (provider) => oauth?.[provider]?.enabled && oauth?.[provider]?.client_id
      );

      return res.status(200).json({
        credentials: true,
        oauth: enabledOauth,
        saml: true,
      });
    } catch (error) {
      console.error("Error listing auth providers:", error);
      return res.status(500).json({ error: "Failed to load authentication providers." });
    }
  }
}

module.exports = new ProvidersController();
