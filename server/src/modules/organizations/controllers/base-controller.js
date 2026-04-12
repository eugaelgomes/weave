/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 *
 * @typedef {Object} AuthenticatedRequest
 * @property {Object} [user]
 * @property {string} user.userId
 *
 * @typedef {Object} OrganizationData
 * @property {string} org_name
 * @property {string[]} [org_domains]
 */

const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

const DOMAIN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

class OrganizationsBaseController {
  constructor() {
    this.organizationsRepository = organizationsRepository;
  }

  /**
   * Validates user authentication.
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {string|null} Returns userId if authenticated, otherwise null.
   */
  _validateAuthentication(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return null;
    }
    return userId;
  }

  /**
   * Gets the organization associated with the user.
   * @param {string} userId
   * @returns {Promise<Object|null>} The organization or null if there is no active organization.
   */
  async _getUserOrganization(userId) {
    const organizations =
      await this.organizationsRepository.getOrgsByUserId(userId);
    return organizations.find((org) => !org.deleted) || null;
  }

  /**
   * Validates the organization's required fields.
   * @param {Partial<OrganizationData>} data
   * @throws {Error} Throws an error if validation fails.
   */
  _validateRequiredFields(data) {
    if (!data.org_name || typeof data.org_name !== "string") {
      throw new Error("Organization name is required");
    }
    if (data.org_name.trim().length < 2) {
      throw new Error("Organization name must be at least 2 characters long");
    }
    if (data.org_name.length > 100) {
      throw new Error("Organization name must be at most 100 characters long");
    }
  }

  /**
   * Normalizes a domain format.
   * @param {string} domain
   * @returns {string|null} The normalized domain or null if the string is invalid.
   */
  _normalizeDomain(domain) {
    if (!domain || typeof domain !== "string") {
      return null;
    }

    const normalized = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*/, "");

    return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
  }

  /**
   * Validates a domain name.
   * @param {string} domain
   * @returns {string} The normalized and validated domain.
   * @throws {Error} Throws an error if the domain is invalid.
   */
  _validateDomainName(domain) {
    const normalized = this._normalizeDomain(domain);

    if (!normalized || !DOMAIN_REGEX.test(normalized)) {
      throw new Error(
        "Invalid domain. Please use a valid domain such as example.com"
      );
    }

    return normalized;
  }

  /**
   * Validates an array of domains.
   * @param {string[]} domains
   * @returns {string[]|null} Array of validated domains or null.
   * @throws {Error} Throws an error if the domains parameter is not an array.
   */
  _validateOrgDomains(domains) {
    if (!domains) return null;
    if (!Array.isArray(domains)) {
      throw new Error("org_domains must be an array");
    }

    const validatedDomains = domains
      .map((domain) => {
        try {
          return this._validateDomainName(domain);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);

    return validatedDomains.length > 0 ? validatedDomains : null;
  }
}

module.exports = OrganizationsBaseController;
