const { BaseIntegration } = require("../../core/base.integration");
const {
  INTEGRATION_CATEGORIES,
  AUTH_TYPES,
  PROVIDER_KEYS,
} = require("../../core/integration.types");
const { notionActions } = require("./notion.actions");
const { NotionClient } = require("./notion.client");

/**
 * Notion Business Integration Adapter
 */
class NotionIntegration extends BaseIntegration {
  constructor() {
    super({
      authType: AUTH_TYPES.BEARER_TOKEN,
      categories: [INTEGRATION_CATEGORIES.KNOWLEDGE_BASE, INTEGRATION_CATEGORIES.PRODUCTIVITY],
      description:
        "Notion integration for managing workspace pages, databases, and business documents.",
      displayName: "Notion",
      iconUrl: "https://assets.weave.app/integrations/notion.svg",
      providerKey: PROVIDER_KEYS.NOTION,
    });

    for (const [actionName, actionConfig] of Object.entries(notionActions)) {
      this.registerAction(actionName, actionConfig.handler, actionConfig.schema);
    }
  }

  async testConnection(credentials) {
    try {
      const client = new NotionClient(credentials);
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

module.exports = { NotionIntegration };
