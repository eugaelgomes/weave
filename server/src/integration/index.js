const { BaseIntegration } = require("./core/base.integration");
const { IntegrationRegistry, integrationRegistry } = require("./core/integration.registry");
const {
  INTEGRATION_CATEGORIES,
  AUTH_TYPES,
  INTEGRATION_STATUS,
  PROVIDER_KEYS,
} = require("./core/integration.types");

const { GoogleIntegration } = require("./providers/google/google.integration");
const { NotionIntegration } = require("./providers/notion/notion.integration");
const { ZendeskIntegration } = require("./providers/zendesk/zendesk.integration");
const { MicrosoftIntegration } = require("./providers/microsoft/microsoft.integration");

/**
 * Automatically register default business application providers
 */
const defaultProviders = [
  new GoogleIntegration(),
  new NotionIntegration(),
  new ZendeskIntegration(),
  new MicrosoftIntegration(),
];

for (const provider of defaultProviders) {
  if (!integrationRegistry.has(provider.providerKey)) {
    integrationRegistry.register(provider);
  }
}

module.exports = {
  AUTH_TYPES,

  // Core classes & singleton
  BaseIntegration,

  // Business Integration Classes
  GoogleIntegration,

  // Types & Enums
  INTEGRATION_CATEGORIES,

  INTEGRATION_STATUS,

  IntegrationRegistry,

  integrationRegistry,

  MicrosoftIntegration,
  NotionIntegration,
  PROVIDER_KEYS,
  ZendeskIntegration,
};
