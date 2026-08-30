const { AUTH_TYPES } = require("./integration.types");
const { AppError } = require("@/errors/app-error");

/**
 * Base abstract class for external business integrations.
 * Every business provider MUST extend this class.
 */
class BaseIntegration {
  /**
   * @param {Object} options
   * @param {string} options.providerKey - Unique slug for provider (e.g. "google")
   * @param {string} options.displayName - Human readable name (e.g. "Google Workspace")
   * @param {string} options.description - Short summary of integration capabilities
   * @param {string[]} options.categories - Array of categories from INTEGRATION_CATEGORIES
   * @param {string} options.authType - Primary auth mechanism from AUTH_TYPES
   * @param {string} [options.iconUrl] - Icon URL or identifier
   */
  constructor(options = {}) {
    if (new.target === BaseIntegration) {
      throw new AppError(
        "BaseIntegration is an abstract class and cannot be instantiated directly.",
        500
      );
    }

    if (!options.providerKey) {
      throw new AppError("Integration must specify a providerKey", 500);
    }

    this.providerKey = options.providerKey;
    this.displayName = options.displayName || options.providerKey;
    this.description = options.description || "";
    this.categories = options.categories || [];
    this.authType = options.authType || AUTH_TYPES.OAUTH2;
    this.iconUrl = options.iconUrl || null;
    this.actionsMap = new Map();
  }

  /**
   * Registers an action handler for this integration.
   * @param {string} actionName - Unique action name (e.g. "sendEmail")
   * @param {Function} handlerFn - Handler function (params, credentials) => Promise<any>
   * @param {Object} [schema] - Schema descriptor or validation rule for params
   */
  registerAction(actionName, handlerFn, schema = {}) {
    if (typeof handlerFn !== "function") {
      throw new AppError(`Handler for action '${actionName}' must be a function`, 500);
    }
    this.actionsMap.set(actionName, { handler: handlerFn, schema });
  }

  /**
   * Returns metadata and capability information for the integration.
   * @returns {Object}
   */
  getCapabilities() {
    const actions = [];
    for (const [name, info] of this.actionsMap.entries()) {
      actions.push({
        name,
        schema: info.schema,
      });
    }

    return {
      actions,
      authType: this.authType,
      categories: this.categories,
      description: this.description,
      displayName: this.displayName,
      iconUrl: this.iconUrl,
      providerKey: this.providerKey,
    };
  }

  /**
   * Validates credentials and verifies connection health.
   * @param {Object} credentials
   * @returns {Promise<{ status: string, details?: any }>}
   */
  async testConnection(_credentials) {
    throw new AppError(`testConnection not implemented for provider ${this.providerKey}`, 500);
  }

  /**
   * Executes a registered action with provided parameters and credentials.
   * @param {string} actionName
   * @param {Object} params
   * @param {Object} credentials
   * @returns {Promise<any>}
   */
  async executeAction(actionName, params = {}, credentials = {}) {
    const action = this.actionsMap.get(actionName);
    if (!action) {
      throw AppError.badRequest(
        `Action '${actionName}' is not supported by integration provider '${this.providerKey}'`
      );
    }

    return await action.handler(params, credentials);
  }
}

module.exports = { BaseIntegration };
