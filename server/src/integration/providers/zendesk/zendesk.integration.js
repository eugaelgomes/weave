const { BaseIntegration } = require("../../core/base.integration");
const {
  INTEGRATION_CATEGORIES,
  AUTH_TYPES,
  PROVIDER_KEYS,
} = require("../../core/integration.types");
const { zendeskActions } = require("./zendesk.actions");
const { ZendeskClient } = require("./zendesk.client");

/**
 * Zendesk Business Integration Adapter
 */
class ZendeskIntegration extends BaseIntegration {
  constructor() {
    super({
      authType: AUTH_TYPES.API_KEY,
      categories: [INTEGRATION_CATEGORIES.TICKETING, INTEGRATION_CATEGORIES.CRM],
      description:
        "Zendesk integration for managing support tickets, customer service interactions, and helpdesk workflow.",
      displayName: "Zendesk",
      iconUrl: "https://assets.weave.app/integrations/zendesk.svg",
      providerKey: PROVIDER_KEYS.ZENDESK,
    });

    for (const [actionName, actionConfig] of Object.entries(zendeskActions)) {
      this.registerAction(actionName, actionConfig.handler, actionConfig.schema);
    }
  }

  async testConnection(credentials) {
    try {
      const client = new ZendeskClient(credentials);
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

module.exports = { ZendeskIntegration };
