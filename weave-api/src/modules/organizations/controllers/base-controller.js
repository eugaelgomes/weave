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
 */

const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const {
  orgRoleHasPermission,
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");

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
   * Gets the active organization associated with the user (via membership + papel `member_role`).
   * @param {string} userId
   * @returns {Promise<Object|null>} The organization or null if there is no active organization.
   */
  async _getUserOrganization(userId) {
    return this.organizationsRepository.getActiveOrganizationWithMembership(
      userId
    );
  }

  /**
   * @param {Object|null} organization — resultado de `_getUserOrganization` (inclui `member_role`)
   * @param {string} permission — `ORG_PERMISSIONS.*`
   * @param {Response} res
   * @returns {boolean} true se autorizado
   */
  _ensureOrgPermission(organization, permission, res) {
    if (!organization) {
      res.status(404).json({
        success: false,
        error: "Organization not found",
      });
      return false;
    }
    const role = organization.member_role;
    if (!role || !orgRoleHasPermission(role, permission)) {
      res.status(403).json({
        success: false,
        error: "Insufficient organization permissions",
        code: "ORG_FORBIDDEN",
      });
      return false;
    }
    return true;
  }

  /**
   * Garante que o utilizador tem uma das permissões listadas (ex.: marca + domínios no mesmo PUT).
   * @param {string[]} permissions
   */
  _ensureOrgPermissionAny(organization, permissions, res) {
    if (!organization) {
      res.status(404).json({
        success: false,
        error: "Organization not found",
      });
      return false;
    }
    const role = organization.member_role;
    if (!role || !permissions.some((p) => orgRoleHasPermission(role, p))) {
      res.status(403).json({
        success: false,
        error: "Insufficient organization permissions",
        code: "ORG_FORBIDDEN",
      });
      return false;
    }
    return true;
  }

  /** Expõe constantes para controladores que precisem de checagens compostas. */
  get _orgPermissions() {
    return ORG_PERMISSIONS;
  }

  /**
   * Papel em `organization_members` (via getActiveOrganizationWithMembership).
   * @param {Object|null} organization
   * @param {string} permission — ORG_PERMISSIONS.*
   */
  _orgRoleHasPermission(organization, permission) {
    const role = organization?.member_role;
    if (!role || !permission) return false;
    return orgRoleHasPermission(role, permission);
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


}

module.exports = OrganizationsBaseController;
