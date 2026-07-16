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
   * Gets the active organization associated with the user (via membership + role `member_role`).
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Organization data with injected `member_role` or null if not found
   */
  async _getUserOrganization(userId) {
    return this.organizationsRepository.getActiveOrganizationWithMembership(
      userId
    );
  }

  /**
   * @param {Object|null} organization — result of `_getUserOrganization` (includes `member_role`)
   * @param {string} permission — `ORG_PERMISSIONS.*`
   * @param {Response} res
   * @returns {boolean} true if authorized
   */
  _ensureOrgPermission(organization, permission, res) {
    if (!organization) {
      res.status(404).json({
        error: "Organization not found",
        success: false,
      });
      return false;
    }
    const role = organization.member_role;
    if (!role || !orgRoleHasPermission(role, permission)) {
      res.status(403).json({
        code: "ORG_FORBIDDEN",
        error: "Insufficient organization permissions",
        success: false,
      });
      return false;
    }
    return true;
  }

  /**
   * Ensures that the user has one of the listed permissions (e.g., brand + domains in the same PUT).
   * @param {Object|null} organization
   * @param {string[]} permissions
   * @param {Response} res
   */
  _ensureOrgPermissionAny(organization, permissions, res) {
    if (!organization) {
      res.status(404).json({
        error: "Organization not found",
        success: false,
      });
      return false;
    }
    const role = organization.member_role;
    if (!role || !permissions.some((p) => orgRoleHasPermission(role, p))) {
      res.status(403).json({
        code: "ORG_FORBIDDEN",
        error: "Insufficient organization permissions",
        success: false,
      });
      return false;
    }
    return true;
  }

  /** Exposes constants for controllers that need compound checks. */
  get _orgPermissions() {
    return ORG_PERMISSIONS;
  }

  /**
   * Role in `organization_members` (via getActiveOrganizationWithMembership).
   * @param {Object} organization - Organization object
   * @param {string} permissionKey - Key of the permission (e.g. MANAGE_MEMBERS)
   * @param {Response} [res] - Optional Express response object for automatic 403
   * @returns {boolean} True if permitted, false otherwise
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
