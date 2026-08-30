const { AppError } = require("@/errors/app-error");
const { BaseIntegration } = require("./base.integration");

/**
 * Registry to manage and resolve external business integrations.
 */
class IntegrationRegistry {
  constructor() {
    this.providers = new Map();
  }

  /**
   * Registers a provider integration instance.
   * @param {BaseIntegration} integrationInstance
   */
  register(integrationInstance) {
    if (!(integrationInstance instanceof BaseIntegration)) {
      throw new AppError("Invalid integration instance. Must extend BaseIntegration.", 500);
    }

    const key = integrationInstance.providerKey.toLowerCase();
    this.providers.set(key, integrationInstance);
  }

  /**
   * Retrieves registered integration by provider key.
   * @param {string} providerKey
   * @returns {BaseIntegration}
   */
  get(providerKey) {
    if (!providerKey) {
      throw AppError.badRequest("providerKey is required");
    }
    const key = providerKey.toLowerCase();
    const integration = this.providers.get(key);
    if (!integration) {
      throw AppError.notFound(`Integration provider '${providerKey}' is not registered`);
    }
    return integration;
  }

  /**
   * Checks if a provider is registered.
   * @param {string} providerKey
   * @returns {boolean}
   */
  has(providerKey) {
    if (!providerKey) return false;
    return this.providers.has(providerKey.toLowerCase());
  }

  /**
   * Lists capability summaries for all registered integrations.
   * @returns {Array<Object>}
   */
  listAllCapabilities() {
    const list = [];
    for (const integration of this.providers.values()) {
      list.push(integration.getCapabilities());
    }
    return list;
  }

  /**
   * Helper to execute an action directly on a provider by key.
   * @param {string} providerKey
   * @param {string} actionName
   * @param {Object} params
   * @param {Object} credentials
   * @returns {Promise<any>}
   */
  async execute(providerKey, actionName, params = {}, credentials = {}) {
    const integration = this.get(providerKey);
    return await integration.executeAction(actionName, params, credentials);
  }

  /**
   * Clears all registered providers (primarily for unit testing).
   */
  clear() {
    this.providers.clear();
  }
}

// Export singleton instance as default registry manager along with class definition
const globalIntegrationRegistry = new IntegrationRegistry();

module.exports = {
  IntegrationRegistry,
  integrationRegistry: globalIntegrationRegistry,
};
