const { BaseIntegration } = require("../../core/base.integration");
const {
  INTEGRATION_CATEGORIES,
  AUTH_TYPES,
  PROVIDER_KEYS,
} = require("../../core/integration.types");
const { slackActions } = require("./slack.actions");
const { SlackClient } = require("./slack.client");

/**
 * Slack Business Integration Adapter
 */
class SlackIntegration extends BaseIntegration {
  constructor() {
    super({
      authType: AUTH_TYPES.OAUTH2,
      categories: [INTEGRATION_CATEGORIES.COMMUNICATION],
      description: "Slack integration for workspace communication and notifications.",
      displayName: "Slack",
      iconUrl: "https://assets.weave.app/integrations/slack.svg",
      providerKey: PROVIDER_KEYS.SLACK || "slack", // fallback in case it's not defined yet
    });

    // Register all supported Slack actions
    for (const [actionName, actionConfig] of Object.entries(slackActions)) {
      this.registerAction(actionName, actionConfig.handler, actionConfig.schema);
    }
  }

  /**
   * Health check for Slack credentials
   */
  async testConnection(credentials) {
    try {
      const client = new SlackClient(credentials);
      // Optional: check valid connection by fetching bot's channels or calling auth.test
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

module.exports = { SlackIntegration };
