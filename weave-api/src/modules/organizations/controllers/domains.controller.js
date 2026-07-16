/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./base-controller').AuthenticatedRequest} AuthenticatedRequest
 */

const crypto = require("crypto");

const OrganizationsBaseController = require("./base-controller");
const domainRepository = require("../repositories/domains.repository");
const {
  enqueueDomainVerificationJob,
} = require("@/services/queue/queue-controller");

/**
 * Controller for organizations domains management.
 * Handles domain registration, verification, deletion, and SSO configuration.
 * Extends BaseOrganizationController for common authentication and organization logic.
 */
class OrganizationDomainsController extends OrganizationsBaseController {
  /**
   * Initialize the controller with domain repository dependency.
   */
  constructor() {
    super();
    this.domainRepository = domainRepository;
  }

  /**
   * Generate a unique domain verification token.
   * @returns {string} Verification token with format: weave-domain-verification=<hex>
   */
  _generateVerificationToken() {
    const randomSeed = crypto.randomBytes(24).toString("hex");
    return `weave-domain-verification=${randomSeed}`;
  }

  /**
   * Serialize domain object with verification instructions.
   * @param {Object} domain - Domain object from database
   * @returns {Object|null} Serialized domain object with DNS verification instructions, or null if domain is undefined
   */
  _serializeDomain(domain) {
    if (!domain) return null;

    return {
      created_at: domain.created_at,
      deleted: domain.deleted,
      domain_name: domain.domain_name,
      id: domain.id,
      instructions: {
        description:
          "Create a TXT record for _weave-challenge.<domain> with the provided value to complete verification.",
        host: `_weave-challenge.${domain.domain_name}`,
        type: "TXT",
        value: domain.verification_token,
      },
      organization_id: domain.organization_id,
      sso_enabled: domain.sso_enabled,
      sso_metadata: domain.sso_metadata,
      sso_provider: domain.sso_provider,
      status: domain.status,
      updated_at: domain.updated_at,
      verification_token: domain.verification_token,
      verified_at: domain.verified_at,
    };
  }

  /**
   * List all domains for authenticated user's organization.
   * @param {Request & AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<void|Response>} JSON response with domains array or error
   */
  async listDomains(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const domains = await this.domainRepository.listByOrganization(
        organization.id
      );

      res.status(200).json({
        domains: domains.map((domain) => this._serializeDomain(domain)),
        status: "OK",
      });
    } catch (error) {
      console.error("Error listing organization domains:", error);
      res.status(500).json({
        error: "Error listing organization domains",
        success: false,
      });
    }
  }

  /**
   * Register a new domain for the organization.
   * Validates domain name uniqueness and generates verification token.
   * @param {Request & AuthenticatedRequest} req - Express request object with domain_name in body
   * @param {Response} res - Express response object
   * @returns {Promise<void|Response>} JSON response with created domain data or validation error
   */
  async createDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      if (
        !this._ensureOrgPermission(
          organization,
          this._orgPermissions.MANAGE_DOMAINS,
          res
        )
      )
        return;

      const { domain_name: domainName } = req.body;

      const normalizedDomain = this._validateDomainName(domainName);

      const duplicatedInOrg =
        await this.domainRepository.findByOrganizationAndName(
          organization.id,
          normalizedDomain
        );

      if (duplicatedInOrg) {
        return res.status(400).json({
          error: "Domain already registered for this organization",
          success: false,
        });
      }

      const existingDomain =
        await this.domainRepository.findActiveByDomain(normalizedDomain);

      if (
        existingDomain &&
        existingDomain.organization_id !== organization.id &&
        !existingDomain.deleted
      ) {
        return res.status(409).json({
          error: "Domain is already in use by another organization",
          success: false,
        });
      }

      const verificationToken = this._generateVerificationToken();

      const domain = await this.domainRepository.createDomain({
        domainName: normalizedDomain,
        organizationId: organization.id,
        verificationToken,
      });

      res.status(201).json({
        data: this._serializeDomain(domain),
        message:
          "Domain registered. Configure the TXT record and click verify.",
        status: "OK",
      });
    } catch (error) {
      console.error("Error registering domain:", error);
      res
        .status(500)
        .json({ error: "Error registering domain", success: false });
    }
  }

  /**
   * Enqueue domain ownership verification via DNS TXT record.
   * Worker checks DNS and retries every 30 minutes until verified.
   * @param {Request & AuthenticatedRequest} req - Express request object with domainId in params
   * @param {Response} res - Express response object
   * @returns {Promise<void|Response>} JSON response with queueing status
   */
  async verifyDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      if (
        !this._ensureOrgPermission(
          organization,
          this._orgPermissions.MANAGE_DOMAINS,
          res
        )
      )
        return;

      const { domainId } = req.params;
      const domain = await this.domainRepository.findById(domainId);

      if (!domain || domain.organization_id !== organization.id) {
        return res
          .status(404)
          .json({ error: "Domain not found", success: false });
      }

      await enqueueDomainVerificationJob({
        domainId: domain.id,
        requestedByUserId: userId,
      });

      res.status(200).json({
        data: this._serializeDomain(domain),
        message:
          "Domain verification queued. Worker will retry DNS every 30 minutes until verified.",
        status: "OK",
      });
    } catch (error) {
      console.error("Error verifying domain:", error);
      res.status(500).json({ error: "Error verifying domain", success: false });
    }
  }

  /**
   * Delete a domain from the organization.
   * Prevents deletion if SSO is enabled for the domain.
   * @param {Request & AuthenticatedRequest} req - Express request object with domainId in params
   * @param {Response} res - Express response object
   * @returns {Promise<void|Response>} JSON response with deletion status and updated organization domains
   */
  async deleteDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      if (
        !this._ensureOrgPermission(
          organization,
          this._orgPermissions.MANAGE_DOMAINS,
          res
        )
      )
        return;

      const { domainId } = req.params;
      const domain = await this.domainRepository.findById(domainId);

      if (!domain || domain.organization_id !== organization.id) {
        return res
          .status(404)
          .json({ error: "Domain not found", success: false });
      }

      if (domain.sso_enabled) {
        return res.status(400).json({
          error:
            "Disable SSO for this domain before removing it from the organization",
          success: false,
        });
      }

      await this.domainRepository.deleteDomain(domain.id);

      res.status(200).json({
        message: "Domain removed successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error deleting domain:", error);
      res.status(500).json({ error: "Error deleting domain", success: false });
    }
  }

  /**
   * Update SSO (SAML) configuration for a verified domain.
   * Enables or disables SAML-based authentication for domain users.
   * @param {Request & AuthenticatedRequest} req - Express request object with domainId in params and SSO config in body
   * @param {Response} res - Express response object
   * @returns {Promise<void|Response>} JSON response with updated domain configuration or validation error
   */
  async updateSsoSettings(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      if (
        !this._ensureOrgPermission(
          organization,
          this._orgPermissions.MANAGE_DOMAINS,
          res
        )
      )
        return;

      const { domainId } = req.params;
      const domain = await this.domainRepository.findById(domainId);

      if (!domain || domain.organization_id !== organization.id) {
        return res
          .status(404)
          .json({ error: "Domain not found", success: false });
      }

      if (domain.status !== "VERIFIED") {
        return res.status(400).json({
          error: "Enable SSO only after domain is verified",
          success: false,
        });
      }

      const { provider, metadata, enabled } = req.body;
      const shouldEnable = enabled === undefined ? true : enabled;

      const normalizedProvider = provider.trim().toLowerCase();

      const sanitizeString = (value) =>
        typeof value === "string" ? value.trim() : null;

      const samlMetadata = {
        certificate: sanitizeString(metadata.certificate),
        entityId: sanitizeString(metadata.entityId),
        sloUrl: sanitizeString(metadata.sloUrl),
        ssoUrl:
          sanitizeString(metadata.ssoUrl) || sanitizeString(metadata.acsUrl),
      };

      const updatedDomain = await this.domainRepository.updateSsoConfiguration(
        domain.id,
        {
          enabled: shouldEnable,
          metadata: samlMetadata,
          provider: normalizedProvider,
        }
      );

      res.status(200).json({
        data: this._serializeDomain(updatedDomain),
        message: shouldEnable
          ? "SAML settings saved. Users of this domain will be redirected to the IdP."
          : "SSO disabled for this domain",
        status: "OK",
      });
    } catch (error) {
      console.error("Error updating SSO settings for domain:", error);
      res.status(500).json({
        error: "Error updating SSO settings for domain",
        success: false,
      });
    }
  }
}

module.exports = new OrganizationDomainsController();
