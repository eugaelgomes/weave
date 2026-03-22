const crypto = require("crypto");

const OrganizationsBaseController = require("./base-controller");
const domainRepository = require("../repositories/domains.repository");
const { verifyDomainToken } = require("@/services/domains/domain-verifier");

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
      id: domain.id,
      organization_id: domain.organization_id,
      domain_name: domain.domain_name,
      verification_token: domain.verification_token,
      status: domain.status,
      sso_enabled: domain.sso_enabled,
      sso_provider: domain.sso_provider,
      sso_metadata: domain.sso_metadata,
      verified_at: domain.verified_at,
      created_at: domain.created_at,
      updated_at: domain.updated_at,
      deleted: domain.deleted,
      instructions: {
        type: "TXT",
        host: `_weave-challenge.${domain.domain_name}`,
        value: domain.verification_token,
        description:
          "Create a TXT record for _weave-challenge.<domain> with the provided value to complete verification.",
      },
    };
  }

  /**
   * List all domains for authenticated user's organization.
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with domains array or error
   */
  async listDomains(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const domains = await this.domainRepository.listByOrganization(
        organization.id
      );

      res.status(200).json({
        status: "OK",
        domains: domains.map((domain) => this._serializeDomain(domain)),
      });
    } catch (error) {
      console.error("Error listing organization domains:", error);
      res.status(500).json({
        success: false,
        error: "Error listing organization domains",
      });
    }
  }

  /**
   * Register a new domain for the organization.
   * Validates domain name uniqueness and generates verification token.
   * @param {Object} req - Express request object with domain_name in body
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with created domain data or validation error
   */
  async createDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { domain_name: domainName } = req.body;
      if (!domainName) {
        return res.status(400).json({
          success: false,
          error: "domain_name is required",
        });
      }

      const normalizedDomain = this._validateDomainName(domainName);

      const duplicatedInOrg =
        await this.domainRepository.findByOrganizationAndName(
          organization.id,
          normalizedDomain
        );

      if (duplicatedInOrg) {
        return res.status(400).json({
          success: false,
          error: "Domain already registered for this organization",
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
          success: false,
          error: "Domain is already in use by another organization",
        });
      }

      const verificationToken = this._generateVerificationToken();

      const domain = await this.domainRepository.createDomain({
        organizationId: organization.id,
        domainName: normalizedDomain,
        verificationToken,
      });

      res.status(201).json({
        status: "OK",
        message:
          "Domain registered. Configure the TXT record and click verify.",
        data: this._serializeDomain(domain),
      });
    } catch (error) {
      console.error("Error registering domain:", error);
      res
        .status(500)
        .json({ success: false, error: "Error registering domain" });
    }
  }

  /**
   * Verify domain ownership via DNS TXT record.
   * Checks if verification token exists in domain's DNS records.
   * @param {Object} req - Express request object with domainId in params
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with verification result and DNS check details
   */
  async verifyDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { domainId } = req.params;
      const domain = await this.domainRepository.findById(domainId);

      if (!domain || domain.organization_id !== organization.id) {
        return res
          .status(404)
          .json({ success: false, error: "Domínio não encontrado" });
      }

      const { isVerified, checkedHosts } = await verifyDomainToken(
        domain.domain_name,
        domain.verification_token
      );

      if (!isVerified) {
        await this.domainRepository.updateVerificationFailure(domain.id);
        return res.status(400).json({
          success: false,
          error:
            "Token not found in domain's DNS TXT records. Wait for propagation and try again.",
          dns_checks: checkedHosts,
        });
      }

      const updatedDomain =
        await this.domainRepository.updateVerificationStatus({
          domainId: domain.id,
          status: "VERIFIED",
          verified: true,
        });

      const orgDomains =
        await this.organizationsRepository.refreshOrgDomainsCache(
          organization.id
        );

      res.status(200).json({
        status: "OK",
        message: "Domain verified successfully",
        data: this._serializeDomain(updatedDomain),
        org_domains: orgDomains,
        dns_checks: checkedHosts,
      });
    } catch (error) {
      console.error("Error verifying domain:", error);
      res
        .status(500)
        .json({ success: false, error: "Error verifying domain" });
    }
  }

  /**
   * Delete a domain from the organization.
   * Prevents deletion if SSO is enabled for the domain.
   * @param {Object} req - Express request object with domainId in params
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with deletion status and updated organization domains
   */
  async deleteDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { domainId } = req.params;
      const domain = await this.domainRepository.findById(domainId);

      if (!domain || domain.organization_id !== organization.id) {
        return res
          .status(404)
          .json({ success: false, error: "Domínio não encontrado" });
      }

      if (domain.sso_enabled) {
        return res.status(400).json({
          success: false,
          error:
            "Disable SSO for this domain before removing it from the organization",
        });
      }

      await this.domainRepository.deleteDomain(domain.id);
      const orgDomains =
        await this.organizationsRepository.refreshOrgDomainsCache(
          organization.id
        );

      res.status(200).json({
        status: "OK",
        message: "Domain removed successfully",
        org_domains: orgDomains,
      });
    } catch (error) {
      console.error("Error deleting domain:", error);
      res
        .status(500)
        .json({ success: false, error: "Error deleting domain" });
    }
  }

  /**
   * Update SSO (SAML) configuration for a verified domain.
   * Enables or disables SAML-based authentication for domain users.
   * @param {Object} req - Express request object with domainId in params and SSO config in body
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with updated domain configuration or validation error
   */
  async updateSsoSettings(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { domainId } = req.params;
      const domain = await this.domainRepository.findById(domainId);

      if (!domain || domain.organization_id !== organization.id) {
        return res
          .status(404)
          .json({ success: false, error: "Domínio não encontrado" });
      }

      if (domain.status !== "VERIFIED") {
        return res.status(400).json({
          success: false,
          error: "Enable SSO only after domain is verified",
        });
      }

      const { provider, metadata, enabled } = req.body;

      if (enabled !== undefined && typeof enabled !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "enabled must be a boolean",
        });
      }

      const shouldEnable = enabled === undefined ? true : enabled;

      if (!provider || typeof provider !== "string") {
        return res.status(400).json({
          success: false,
          error: "provider is required",
        });
      }

      const normalizedProvider = provider.trim().toLowerCase();

      if (normalizedProvider !== "saml") {
        return res.status(400).json({
          success: false,
          error: "Currently only SAML providers are supported",
        });
      }

      if (!metadata || typeof metadata !== "object") {
        return res.status(400).json({
          success: false,
          error: "metadata is required and must be an object",
        });
      }

      const sanitizeString = (value) =>
        typeof value === "string" ? value.trim() : null;

      const samlMetadata = {
        entityId: sanitizeString(metadata.entityId),
        ssoUrl:
          sanitizeString(metadata.ssoUrl) || sanitizeString(metadata.acsUrl),
        sloUrl: sanitizeString(metadata.sloUrl),
        certificate: sanitizeString(metadata.certificate),
      };

      if (
        !samlMetadata.entityId ||
        !samlMetadata.ssoUrl ||
        !samlMetadata.certificate
      ) {
        return res.status(400).json({
          success: false,
          error:
            "metadata must contain entityId, ssoUrl (or acsUrl) and certificate",
        });
      }

      const updatedDomain = await this.domainRepository.updateSsoConfiguration(
        domain.id,
        {
          provider: normalizedProvider,
          metadata: samlMetadata,
          enabled: shouldEnable,
        }
      );

      res.status(200).json({
        status: "OK",
        message: shouldEnable
          ? "SAML settings saved. Users of this domain will be redirected to the IdP."
          : "SSO disabled for this domain",
        data: this._serializeDomain(updatedDomain),
      });
    } catch (error) {
      console.error("Error updating SSO settings for domain:", error);
      res.status(500).json({
        success: false,
        error: "Error updating SSO settings for domain",
      });
    }
  }
}

module.exports = new OrganizationDomainsController();
