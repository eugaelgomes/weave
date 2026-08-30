const { BaseIntegration } = require("../../core/base.integration");
const {
  INTEGRATION_CATEGORIES,
  AUTH_TYPES,
  PROVIDER_KEYS,
} = require("../../core/integration.types");
const { googleActions } = require("./google.actions");
const { GoogleClient } = require("./google.client");

/**
 * Google Workspace Business Integration Adapter
 */
class GoogleIntegration extends BaseIntegration {
  constructor() {
    super({
      authType: AUTH_TYPES.OAUTH2,
      categories: [
        INTEGRATION_CATEGORIES.COMMUNICATION,
        INTEGRATION_CATEGORIES.STORAGE,
        INTEGRATION_CATEGORIES.CALENDAR,
        INTEGRATION_CATEGORIES.PRODUCTIVITY,
      ],
      description: "Google Workspace integration for Gmail, Google Drive, and Google Calendar.",
      displayName: "Google Workspace",
      iconUrl: "https://assets.weave.app/integrations/google.svg",
      providerKey: PROVIDER_KEYS.GOOGLE,
    });

    // Register all supported Google Workspace business actions
    for (const [actionName, actionConfig] of Object.entries(googleActions)) {
      this.registerAction(actionName, actionConfig.handler, actionConfig.schema);
    }
  }

  /**
   * Health check for Google Workspace credentials
   */
  async testConnection(credentials) {
    try {
      const client = new GoogleClient(credentials);
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

module.exports = { GoogleIntegration };
