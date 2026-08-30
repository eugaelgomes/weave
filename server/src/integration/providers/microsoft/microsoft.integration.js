const { BaseIntegration } = require("../../core/base.integration");
const {
  INTEGRATION_CATEGORIES,
  AUTH_TYPES,
  PROVIDER_KEYS,
} = require("../../core/integration.types");
const { microsoftActions } = require("./microsoft.actions");
const { MicrosoftClient } = require("./microsoft.client");

/**
 * Microsoft 365 Business Integration Adapter
 */
class MicrosoftIntegration extends BaseIntegration {
  constructor() {
    super({
      authType: AUTH_TYPES.OAUTH2,
      categories: [
        INTEGRATION_CATEGORIES.COMMUNICATION,
        INTEGRATION_CATEGORIES.CALENDAR,
        INTEGRATION_CATEGORIES.PRODUCTIVITY,
      ],
      description:
        "Microsoft 365 integration for Teams chat/channels, Outlook mail, and Microsoft Graph Calendar.",
      displayName: "Microsoft 365",
      iconUrl: "https://assets.weave.app/integrations/microsoft.svg",
      providerKey: PROVIDER_KEYS.MICROSOFT,
    });

    for (const [actionName, actionConfig] of Object.entries(microsoftActions)) {
      this.registerAction(actionName, actionConfig.handler, actionConfig.schema);
    }
  }

  async testConnection(credentials) {
    try {
      const client = new MicrosoftClient(credentials);
      client.validateAuth();
      return {
        provider: this.providerKey,
        status: "connected",
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        error: err.message,
        provider: this.providerKey,
        status: "error",
      };
    }
  }
}

module.exports = { MicrosoftIntegration };
